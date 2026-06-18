/**
 * dev-backend.js
 * Serveur de test local double usage avec persistance SQLite NATIVE :
 * 1. Serveur SMTP local (écoute sur le port 1025) - Reçoit et enregistre les emails de test.
 * 2. Serveur HTTP API (écoute sur le port 3002) - Gère la passerelle e-mail et sert de base de données SQLite.
 *
 * Utilise le module natif expérimental 'node:sqlite' de Node.js 22.5+/24+.
 * AUCUN paquet npm additionnel à installer !
 */

import net from 'net';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SMTP_PORT = 1025;
const HTTP_PORT = 3002;
const EMAIL_DIR = path.join(__dirname, 'received_emails');
const DB_FILE = path.join(__dirname, 'database.db');

// S'assurer de la présence du dossier d'enregistrement des mails
if (!fs.existsSync(EMAIL_DIR)) {
  fs.mkdirSync(EMAIL_DIR);
}

// Helper pour hacher le mot de passe (SHA-256)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// ----------------------------------------------------
// INITIALISATION DE LA BASE DE DONNÉES SQLITE
// ----------------------------------------------------
const db = new DatabaseSync(DB_FILE);

// Création des tables Multi-Tenant
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    nom TEXT,
    date_creation TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    email TEXT UNIQUE,
    nom TEXT,
    password_hash TEXT,
    role TEXT,
    date_creation TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS alpha_requests (
    id TEXT PRIMARY KEY,
    nom_complet TEXT,
    nom_entreprise TEXT,
    volume_factures TEXT,
    email TEXT,
    statut TEXT,
    token TEXT,
    date_creation TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tenant_settings (
    company_id TEXT PRIMARY KEY,
    value TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    nom TEXT,
    email TEXT,
    description TEXT,
    date_creation TEXT,
    historique TEXT,
    company_id TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS factures (
    id_facture TEXT PRIMARY KEY,
    client_id TEXT,
    nom_client TEXT,
    email_client TEXT,
    montant REAL,
    date_emission TEXT,
    date_echeance TEXT,
    statut_paiement TEXT,
    date_paiement_effective TEXT,
    pdf_content TEXT,
    company_id TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS relances (
    id TEXT PRIMARY KEY,
    facture_id TEXT,
    client_nom TEXT,
    type_relance TEXT,
    date_envoi TEXT,
    sujet TEXT,
    corps TEXT,
    mode TEXT,
    statut_envoi TEXT,
    company_id TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    nom TEXT,
    primary_color TEXT,
    layout_type TEXT,
    footer_text TEXT,
    logo_base64 TEXT,
    company_id TEXT
  )
`);

// Migrations pour ajouter 'company_id' si non présent (pour compatibilité)
const tablesToMigrate = ['clients', 'factures', 'relances', 'templates'];
for (const table of tablesToMigrate) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN company_id TEXT`);
  } catch (e) {
    // Ignorer si la colonne existe déjà
  }
}

// Initialisation de l'entreprise de démo
const defaultCompanyId = 'company-demo';
const checkCompany = db.prepare('SELECT COUNT(*) as count FROM companies').get();
if (checkCompany.count === 0) {
  db.prepare('INSERT INTO companies (id, nom, date_creation) VALUES (?, ?, ?)').run(
    defaultCompanyId,
    'Entreprise Démo ACME',
    new Date().toISOString().split('T')[0]
  );
}

// Initialisation de l'administrateur de démo
const checkUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (checkUsers.count === 0) {
  const adminHash = hashPassword('admin123');
  db.prepare('INSERT INTO users (id, company_id, email, nom, password_hash, role, date_creation) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    'u-demo',
    defaultCompanyId,
    'admin@demo.com',
    'Démo Administrateur',
    adminHash,
    'admin',
    new Date().toISOString().split('T')[0]
  );
}

// Migrer les anciennes lignes qui n'ont pas de company_id
for (const table of tablesToMigrate) {
  db.exec(`UPDATE ${table} SET company_id = '${defaultCompanyId}' WHERE company_id IS NULL`);
}

// Initialiser les paramètres de l'entreprise démo
const checkTenantSettings = db.prepare('SELECT COUNT(*) as count FROM tenant_settings WHERE company_id = ?').get(defaultCompanyId);
if (checkTenantSettings.count === 0) {
  db.prepare('INSERT INTO tenant_settings (company_id, value) VALUES (?, ?)').run(
    defaultCompanyId,
    JSON.stringify({
      smtpHost: 'localhost',
      smtpPort: 1025,
      smtpUser: 'test',
      smtpPass: '',
      senderName: 'Service Comptable (Local)',
      senderEmail: 'compta@localhost.com',
      autoSendEnabled: false,
      autoSendDelayDays: 1
    })
  );
}

// Peupler les templates pour l'entreprise démo si vide
const checkTemplates = db.prepare('SELECT COUNT(*) as count FROM templates WHERE company_id = ?').get(defaultCompanyId);
if (checkTemplates.count === 0) {
  const insertTemplate = db.prepare('INSERT INTO templates (id, nom, primary_color, layout_type, footer_text, logo_base64, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertTemplate.run('t-1', 'Indigo Moderne', '#4338ca', 'colored_header', 'Merci pour votre confiance. Facture payable par virement bancaire.', null, defaultCompanyId);
  insertTemplate.run('t-2', 'Minimaliste Épuré', '#1f2937', 'minimalist', 'Facture payable à réception. Aucun escompte pour paiement anticipé.', null, defaultCompanyId);
  insertTemplate.run('t-3', 'Émeraude Corporatif', '#059669', 'bold_accent', 'RelanceFacture MVP - Service Facturation. Pénalités de retard applicables.', null, defaultCompanyId);
}

// Peupler les clients et factures pour l'entreprise démo si vide
const checkClients = db.prepare('SELECT COUNT(*) as count FROM clients WHERE company_id = ?').get(defaultCompanyId);
if (checkClients.count === 0) {
  console.log('[SQLite] Initialisation des données de démonstration multi-tenant...');

  // Insertion Clients
  const insertClient = db.prepare('INSERT INTO clients (id, nom, email, description, date_creation, historique, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertClient.run('c-1', 'Entreprise ACME', 'compta@acme.com', 'Client historique, leader de la distribution de matériel.', '2026-01-01', JSON.stringify([
    { date_echeance: "2026-01-15", date_paiement_effective: "2026-01-20" },
    { date_echeance: "2026-02-15", date_paiement_effective: "2026-02-22" },
    { date_echeance: "2026-03-15", date_paiement_effective: "2026-03-25" }
  ]), defaultCompanyId);
  insertClient.run('c-2', 'Société Globex', 'billing@globex.org', 'Prestataire de services logistiques internationaux.', '2026-01-10', JSON.stringify([
    { date_echeance: "2026-01-10", date_paiement_effective: "2026-01-10" },
    { date_echeance: "2026-02-10", date_paiement_effective: "2026-02-09" },
    { date_echeance: "2026-03-10", date_paiement_effective: "2026-03-10" }
  ]), defaultCompanyId);
  insertClient.run('c-3', 'Initech', 'finance@initech.io', 'Éditeur de logiciels, bureau d\'études techniques.', '2026-01-05', JSON.stringify([
    { date_echeance: "2026-01-05", date_paiement_effective: "2026-01-25" },
    { date_echeance: "2026-02-05", date_paiement_effective: "2026-03-10" },
    { date_echeance: "2026-03-05", date_paiement_effective: "2026-04-15" }
  ]), defaultCompanyId);

  // Insertion Factures
  const insertFacture = db.prepare('INSERT INTO factures (id_facture, client_id, nom_client, email_client, montant, date_emission, date_echeance, statut_paiement, date_paiement_effective, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertFacture.run('FAC-2026-010', 'c-1', 'Entreprise ACME', 'compta@acme.com', 2400.00, '2026-04-15', '2026-05-15', 'En attente', null, defaultCompanyId);
  insertFacture.run('FAC-2026-011', 'c-2', 'Société Globex', 'billing@globex.org', 5800.00, '2026-05-01', '2026-06-15', 'En attente', null, defaultCompanyId);
  insertFacture.run('FAC-2026-012', 'c-3', 'Initech', 'finance@initech.io', 4200.00, '2026-04-01', '2026-05-01', 'En attente', null, defaultCompanyId);
  insertFacture.run('FAC-2026-008', 'c-1', 'Entreprise ACME', 'compta@acme.com', 1800.00, '2026-03-01', '2026-04-01', 'Paye', '2026-04-12', defaultCompanyId);
}

// Helper pour sauvegarder les e-mails reçus
function sauvegarderEmail(from, to, subject, body, method = 'SMTP') {
  const timestamp = Date.now();
  const cleanTo = to.replace(/[^a-zA-Z0-9@.]/g, '_');
  const filename = `email_${timestamp}_to_${cleanTo}.txt`;
  const filepath = path.join(EMAIL_DIR, filename);

  const fileContent = `==================================================\n` +
                      `SOURCE PROTOCOLE : ${method}\n` +
                      `SENDER/FROM      : ${from}\n` +
                      `RECIPIENT/TO     : ${to}\n` +
                      `SUBJECT/OBJET    : ${subject}\n` +
                      `DATE D'ENVOI     : ${new Date().toLocaleString('fr-FR')}\n` +
                      `==================================================\n\n` +
                      `${body}\n`;

  fs.writeFileSync(filepath, fileContent, 'utf8');

  console.log('\n┌────────────────────────────────────────────────────────┐');
  console.log(`│ 📥 EMAIL CAPTURÉ EN LOCAL (${method})                     │`);
  console.log('└────────────────────────────────────────────────────────┘');
  console.log(` Expéditeur  : ${from}`);
  console.log(` Destinataire : ${to}`);
  console.log(` Objet       : ${subject}`);
  console.log(` Fichier créé : received_emails/${filename}`);
  console.log('──────────────────────────────────────────────────────────\n');
}

// ----------------------------------------------------
// SERVEUR SMTP LOCAL (Port 1025)
// ----------------------------------------------------
const smtpServer = net.createServer((socket) => {
  let state = 'GREETING';
  let emailData = '';
  let mailFrom = '';
  let rcptTo = '';

  socket.setEncoding('utf8');
  socket.write('220 localhost ESMTP Test Server ready\r\n');

  socket.on('data', (data) => {
    const lines = data.split('\r\n');

    for (let line of lines) {
      if (!line && state !== 'DATA') continue;

      if (state === 'DATA') {
        if (line === '.') {
          state = 'COMMAND';
          socket.write('250 OK: Message received\r\n');
          
          let subject = 'Sans objet';
          let body = emailData;
          
          const subjectMatch = emailData.match(/Subject:\s*(.*)/i);
          if (subjectMatch) {
            subject = subjectMatch[1].trim();
          }

          sauvegarderEmail(mailFrom, rcptTo, subject, body, 'SMTP');
          
          emailData = '';
          mailFrom = '';
          rcptTo = '';
        } else {
          emailData += line + '\n';
        }
        continue;
      }

      const command = line.toUpperCase();

      if (command.startsWith('HELO') || command.startsWith('EHLO')) {
        socket.write('250-localhost hello\r\n250 AUTH PLAIN LOGIN\r\n');
      } else if (command.startsWith('MAIL FROM:')) {
        mailFrom = line.replace(/MAIL FROM:\s*/i, '').trim();
        socket.write('250 OK\r\n');
      } else if (command.startsWith('RCPT TO:')) {
        rcptTo = line.replace(/RCPT TO:\s*/i, '').trim();
        socket.write('250 OK\r\n');
      } else if (command === 'DATA') {
        state = 'DATA';
        socket.write('354 Start mail input; end with <CRLF>.<CRLF>\r\n');
      } else if (command === 'QUIT') {
        socket.write('221 localhost closing connection\r\n');
        socket.end();
      } else if (command.startsWith('AUTH ')) {
        socket.write('235 Authentication successful\r\n');
      } else {
        socket.write('250 OK\r\n');
      }
    }
  });

  socket.on('error', (err) => {
    console.error('Erreur SMTP Socket:', err.message);
  });
});

smtpServer.listen(SMTP_PORT, () => {
  console.log(`[SMTP] Serveur de messagerie actif sur port ${SMTP_PORT}`);
});

// ----------------------------------------------------
// SERVEUR HTTP API Relais & Données SQLite (Port 3002)
// ----------------------------------------------------
const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // 1. Récupérer toutes les données d'une entreprise (Synchro initiale)
  if (pathname === '/api/sync' && req.method === 'GET') {
    const companyId = reqUrl.searchParams.get('company_id') || 'company-demo';
    try {
      const qClients = db.prepare('SELECT * FROM clients WHERE company_id = ?').all(companyId);
      const qFactures = db.prepare('SELECT * FROM factures WHERE company_id = ?').all(companyId);
      const qSettings = db.prepare('SELECT value FROM tenant_settings WHERE company_id = ?').get(companyId);
      const qRelances = db.prepare('SELECT * FROM relances WHERE company_id = ? ORDER BY date_envoi DESC').all(companyId);
      const qTemplates = db.prepare('SELECT * FROM templates WHERE company_id = ?').all(companyId);

      // Formater historique JSON
      const formattedClients = qClients.map(c => ({
        ...c,
        historique: JSON.parse(c.historique || '[]')
      }));

      const formattedSettings = qSettings ? JSON.parse(qSettings.value) : {
        smtpHost: 'localhost',
        smtpPort: 1025,
        smtpUser: 'test',
        smtpPass: '',
        senderName: 'Service Comptable (Local)',
        senderEmail: 'compta@localhost.com',
        autoSendEnabled: false,
        autoSendDelayDays: 1
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        clients: formattedClients,
        factures: qFactures,
        emailSettings: formattedSettings,
        historiqueRelances: qRelances,
        templates: qTemplates
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
  }

  // 2. Ajouter/Mettre à jour un Client
  else if (pathname === '/api/clients' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const client = JSON.parse(body);
        const companyId = client.company_id || 'company-demo';
        const upsert = db.prepare(`
          INSERT INTO clients (id, nom, email, description, date_creation, historique, company_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            nom=excluded.nom,
            email=excluded.email,
            description=excluded.description,
            historique=excluded.historique
        `);
        upsert.run(
          client.id,
          client.nom,
          client.email,
          client.description,
          client.date_creation || new Date().toISOString().split('T')[0],
          JSON.stringify(client.historique || []),
          companyId
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 3. Ajouter/Mettre à jour une Facture
  else if (pathname === '/api/factures' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const fac = JSON.parse(body);
        const companyId = fac.company_id || 'company-demo';
        const upsert = db.prepare(`
          INSERT INTO factures (id_facture, client_id, nom_client, email_client, montant, date_emission, date_echeance, statut_paiement, date_paiement_effective, pdf_content, company_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id_facture) DO UPDATE SET
            client_id=excluded.client_id,
            nom_client=excluded.nom_client,
            email_client=excluded.email_client,
            montant=excluded.montant,
            date_emission=excluded.date_emission,
            date_echeance=excluded.date_echeance,
            statut_paiement=excluded.statut_paiement,
            date_paiement_effective=excluded.date_paiement_effective,
            pdf_content=excluded.pdf_content
        `);
        upsert.run(
          fac.id_facture,
          fac.client_id,
          fac.nom_client,
          fac.email_client,
          Number(fac.montant),
          fac.date_emission,
          fac.date_echeance,
          fac.statut_paiement,
          fac.date_paiement_effective || null,
          fac.pdf_content || null,
          companyId
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 4. Supprimer une Facture
  else if (pathname === '/api/factures/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        
        db.prepare('DELETE FROM factures WHERE id_facture = ?').run(payload.id_facture);
        db.prepare('DELETE FROM relances WHERE facture_id = ?').run(payload.id_facture);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 5. Enregistrer le règlement d'une facture
  else if (pathname === '/api/factures/pay' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { id_facture, date_paiement_effective } = payload;

        // 1. Lire la facture
        const fac = db.prepare('SELECT * FROM factures WHERE id_facture = ?').get(id_facture);
        if (!fac) throw new Error('Facture introuvable');

        // 2. Mettre à jour la facture
        db.prepare('UPDATE factures SET statut_paiement = "Paye", date_paiement_effective = ? WHERE id_facture = ?')
          .run(date_paiement_effective, id_facture);

        // 3. Mettre à jour l'historique de paiement du client
        const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(fac.client_id);
        if (client) {
          const historique = JSON.parse(client.historique || '[]');
          historique.push({
            date_echeance: fac.date_echeance,
            date_paiement_effective
          });

          db.prepare('UPDATE clients SET historique = ? WHERE id = ?')
            .run(JSON.stringify(historique), fac.client_id);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 6. Enregistrer les paramètres de messagerie d'un client
  else if (pathname === '/api/settings' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { company_id, ...settings } = payload;
        const targetCompanyId = company_id || 'company-demo';

        db.prepare('INSERT OR REPLACE INTO tenant_settings (company_id, value) VALUES (?, ?)')
          .run(targetCompanyId, JSON.stringify(settings));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 7. Enregistrer une relance (e-mail envoyé)
  else if (pathname === '/api/relances' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const rel = JSON.parse(body);
        const companyId = rel.company_id || 'company-demo';
        db.prepare(`
          INSERT INTO relances (id, facture_id, client_nom, type_relance, date_envoi, sujet, corps, mode, statut_envoi, company_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          rel.id,
          rel.facture_id,
          rel.client_nom,
          rel.type_relance,
          rel.date_envoi,
          rel.sujet,
          rel.corps,
          rel.mode,
          rel.statut_envoi,
          companyId
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 8. Passerelle d'envoi d'e-mail HTTP
  else if (pathname === '/api/send-email' && req.method === 'POST') {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(bodyData);
        const { senderEmail, senderName, recipientEmail, subject, body } = payload;

        sauvegarderEmail(
          `"${senderName}" <${senderEmail}>`,
          recipientEmail,
          subject,
          body,
          'HTTP-Relay'
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Email relayé avec succès' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 9. Enregistrer/Mettre à jour un modèle de facture
  else if (pathname === '/api/templates' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const t = JSON.parse(body);
        const companyId = t.company_id || 'company-demo';
        const upsert = db.prepare(`
          INSERT INTO templates (id, nom, primary_color, layout_type, footer_text, logo_base64, company_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            nom=excluded.nom,
            primary_color=excluded.primary_color,
            layout_type=excluded.layout_type,
            footer_text=excluded.footer_text,
            logo_base64=excluded.logo_base64
        `);
        upsert.run(
          t.id,
          t.nom,
          t.primary_color,
          t.layout_type,
          t.footer_text,
          t.logo_base64 || null,
          companyId
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 10. Supprimer un modèle de facture
  else if (pathname === '/api/templates/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        db.prepare('DELETE FROM templates WHERE id = ?').run(payload.id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 11. Soumission d'une demande d'accès Alpha (Landing Page)
  else if (pathname === '/api/alpha/request' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { nom_complet, nom_entreprise, volume_factures, email } = data;
        if (!nom_complet || !nom_entreprise || !volume_factures || !email) {
          throw new Error("Tous les champs sont requis.");
        }

        const id = `req-${Date.now()}`;
        db.prepare(`
          INSERT INTO alpha_requests (id, nom_complet, nom_entreprise, volume_factures, email, statut, token, date_creation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, nom_complet, nom_entreprise, volume_factures, email, 'en_attente', null, new Date().toISOString());

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 12. Obtenir toutes les demandes d'accès Alpha (Dashboard Admin)
  else if (pathname === '/api/admin/alpha/requests' && req.method === 'GET') {
    try {
      const requests = db.prepare('SELECT * FROM alpha_requests ORDER BY date_creation DESC').all();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(requests));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
  }

  // 13. Valider une demande Alpha (génère la compagnie, le token et simule l'email)
  else if (pathname === '/api/admin/alpha/validate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        const request = db.prepare('SELECT * FROM alpha_requests WHERE id = ?').get(id);
        if (!request) throw new Error("Demande introuvable");

        const token = crypto.randomBytes(24).toString('hex');
        const companyId = `company-${Date.now()}`;

        // Créer l'entreprise
        db.prepare('INSERT INTO companies (id, nom, date_creation) VALUES (?, ?, ?)').run(
          companyId,
          request.nom_entreprise,
          new Date().toISOString().split('T')[0]
        );

        // Mettre à jour la demande avec le token d'invitation (format companyId:token)
        const tokenInvitation = `${companyId}:${token}`;
        db.prepare('UPDATE alpha_requests SET statut = ?, token = ? WHERE id = ?').run(
          'valide',
          tokenInvitation,
          id
        );

        // Initialiser un modèle par défaut pour la nouvelle entreprise
        db.prepare('INSERT INTO templates (id, nom, primary_color, layout_type, footer_text, logo_base64, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(`t-${Date.now()}`, 'Indigo Moderne', '#4338ca', 'colored_header', 'Merci pour votre confiance. Facture payable par virement bancaire.', null, companyId);

        // Simuler l'envoi de l'email d'onboarding
        // Utilise l'en-tête Origin de la requête pour détecter l'URL du frontend
        const frontendOrigin = req.headers.origin || 'http://localhost:3000';
        const link = `${frontendOrigin}/auth/welcome?token=${tokenInvitation}`;
        const emailMsg = `Bonjour ${request.nom_complet},\n\nVotre demande d'accès à RelanceFacture a été approuvée !\nPour finaliser l'installation et configurer le mot de passe administrateur de votre entreprise "${request.nom_entreprise}", veuillez cliquer sur le lien unique ci-dessous :\n\n${link}\n\nL'équipe RelanceFacture`;
        
        sauvegarderEmail(
          `"RelanceFacture Onboarding" <onboarding@relancefacture.saas>`,
          request.email,
          `Accès Alpha validé - Bienvenue chez RelanceFacture !`,
          emailMsg,
          'SYSTEM-Onboarding'
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', invitationLink: link }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 14. Rejeter une demande Alpha
  else if (pathname === '/api/admin/alpha/reject' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        db.prepare("UPDATE alpha_requests SET statut = 'rejete' WHERE id = ?").run(id);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 15. Vérifier un token d'invitation
  else if (pathname === '/api/auth/verify-token' && req.method === 'GET') {
    try {
      const token = reqUrl.searchParams.get('token');
      if (!token) throw new Error("Token manquant");

      const request = db.prepare('SELECT * FROM alpha_requests WHERE token = ? AND statut = ?').get(token, 'valide');
      if (!request) throw new Error("Lien d'invitation invalide ou déjà utilisé.");

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        nom_complet: request.nom_complet,
        nom_entreprise: request.nom_entreprise,
        email: request.email
      }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
  }

  // 16. Enregistrer le mot de passe admin suite à invitation
  else if (pathname === '/api/auth/register' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { token, password } = JSON.parse(body);
        if (!token || !password) throw new Error("Champs requis manquants");

        const request = db.prepare('SELECT * FROM alpha_requests WHERE token = ? AND statut = ?').get(token, 'valide');
        if (!request) throw new Error("Lien d'invitation invalide ou expiré.");

        const companyId = token.split(':')[0];
        const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
        if (!company) throw new Error("Compagnie introuvable");

        const userId = `u-${Date.now()}`;
        const passHash = hashPassword(password);

        // Insérer l'utilisateur admin
        db.prepare('INSERT INTO users (id, company_id, email, nom, password_hash, role, date_creation) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          userId,
          companyId,
          request.email,
          request.nom_complet,
          passHash,
          'admin',
          new Date().toISOString().split('T')[0]
        );

        // Marquer la demande comme finalisée et expirer le token
        db.prepare("UPDATE alpha_requests SET statut = 'active', token = NULL WHERE id = ?").run(request.id);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          user: {
            id: userId,
            nom: request.nom_complet,
            email: request.email,
            role: 'admin',
            company_id: companyId
          },
          company: {
            id: companyId,
            nom: company.nom
          }
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  // 17. Connexion utilisateur classique
  else if (pathname === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        if (!email || !password) throw new Error("Champs requis manquants");

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) throw new Error("Identifiants incorrects");

        const passHash = hashPassword(password);
        if (user.password_hash !== passHash) throw new Error("Identifiants incorrects");

        const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(user.company_id);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          user: {
            id: user.id,
            nom: user.nom,
            email: user.email,
            role: user.role,
            company_id: user.company_id
          },
          company: {
            id: user.company_id,
            nom: company ? company.nom : "Entreprise"
          }
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
  }

  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'Endpoint introuvable' }));
  }
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`[HTTP] API & SQLite active sur port ${HTTP_PORT} (SQLite: database.db)`);
  console.log(`------------------------------------------------------------`);
  console.log(`👉 Base de données SQLite persistée localement active !`);
  console.log(`👉 Les emails capturés apparaîtront dans : received_emails/`);
  console.log(`------------------------------------------------------------`);
});
