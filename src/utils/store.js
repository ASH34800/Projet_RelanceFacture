import { ref, watch } from 'vue';

const BACKEND_URL = 'http://localhost:3002';

// ----------------------------------------------------
// Variables Réactives Globales d'Authentification
// ----------------------------------------------------
export const utilisateurConnecte = ref(JSON.parse(localStorage.getItem('rf_user')) || null);
export const companyActive = ref(JSON.parse(localStorage.getItem('rf_company')) || null);
export const tokenSession = ref(localStorage.getItem('rf_session_token') || null);

// ----------------------------------------------------
// Variables Réactives Globales de Données (partagées avec les composants)
// ----------------------------------------------------
export const clients = ref([]);
export const factures = ref([]);
export const emailSettings = ref({
  smtpHost: 'localhost',
  smtpPort: 1025,
  smtpUser: 'test',
  smtpPass: '',
  senderName: 'Service Comptable (Local)',
  senderEmail: 'compta@localhost.com',
  autoSendEnabled: false,
  autoSendDelayDays: 1
});
export const historiqueRelances = ref([]);
export const templates = ref([]);

// Flag pour éviter des boucles d'écriture lors de la synchro initiale
let estEnTrainDeCharger = false;

// ----------------------------------------------------
// Fonction de synchronisation initiale avec le Backend SQLite (Filtré Multi-Tenant)
// ----------------------------------------------------
export async function chargerDonneesDepuisBackend() {
  estEnTrainDeCharger = true;
  try {
    const companyId = companyActive.value ? companyActive.value.id : 'company-demo';
    const response = await fetch(`${BACKEND_URL}/api/sync?company_id=${companyId}`);
    if (response.ok) {
      const data = await response.json();
      
      clients.value = data.clients || [];
      factures.value = data.factures || [];
      historiqueRelances.value = data.historiqueRelances || [];
      templates.value = data.templates || [];
      
      if (data.emailSettings && Object.keys(data.emailSettings).length > 0) {
        emailSettings.value = data.emailSettings;
      }
      console.log(`[SQLite Store] Données multi-tenant synchronisées pour l'entreprise : ${companyId}`);
    } else {
      throw new Error("Impossible de joindre l'API");
    }
  } catch (err) {
    console.warn('[Store] Échec de connexion avec le backend SQLite. Utilisation du localStorage de secours.', err);
    chargerDepuisLocalStorageDeSecours();
  } finally {
    estEnTrainDeCharger = false;
  }
}

// Lancement immédiat de la synchro au démarrage
chargerDonneesDepuisBackend();

// ----------------------------------------------------
// Observateur pour sauvegarder automatiquement les préférences d'e-mail par entreprise
// ----------------------------------------------------
watch(emailSettings, async (newVal) => {
  if (estEnTrainDeCharger) return;
  
  // Toujours sauvegarder en localstorage de secours
  localStorage.setItem('rf_email_settings', JSON.stringify(newVal));

  const companyId = companyActive.value ? companyActive.value.id : 'company-demo';

  // Tenter de pousser au backend SQLite
  try {
    await fetch(`${BACKEND_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newVal,
        company_id: companyId
      })
    });
  } catch (e) {
    // Silencieux si hors ligne
  }
}, { deep: true });

// ----------------------------------------------------
// Méthodes d'action Clients / Entreprises
// ----------------------------------------------------

/**
 * Ajoute manuellement une nouvelle entreprise (Client)
 */
export async function ajouterClientManuellement(clientData) {
  const companyId = companyActive.value ? companyActive.value.id : 'company-demo';
  const nouveauClient = {
    id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    nom: clientData.nom,
    email: clientData.email,
    description: clientData.description || 'Aucune description disponible.',
    date_creation: new Date().toISOString().split('T')[0],
    historique: [],
    company_id: companyId
  };

  // 1. Ajouter localement pour retour réactif instantané
  clients.value.push(nouveauClient);
  sauvegarderClientsLocalstorageDeSecours();

  // 2. Pousser en base SQLite réelle
  try {
    await fetch(`${BACKEND_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nouveauClient)
    });
  } catch (e) {
    console.warn('[Store] Client stocké localement (API injoignable).');
  }

  return nouveauClient;
}

// ----------------------------------------------------
// Méthodes d'action Factures
// ----------------------------------------------------

export async function ajouterFacture(factureImportee) {
  const companyId = companyActive.value ? companyActive.value.id : 'company-demo';

  // Déterminer ou créer le client associé
  let client = clients.value.find(c => c.nom.toLowerCase() === factureImportee.nom_client.toLowerCase());
  let clientEstNouveau = false;

  if (!client) {
    clientEstNouveau = true;
    client = {
      id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      nom: factureImportee.nom_client,
      email: factureImportee.email_client,
      description: 'Client créé via facturation.',
      date_creation: new Date().toISOString().split('T')[0],
      historique: factureImportee.historique_paiements_passes || [],
      company_id: companyId
    };
    clients.value.push(client);
    sauvegarderClientsLocalstorageDeSecours();
  }

  const index = factures.value.findIndex(f => f.id_facture === factureImportee.id_facture);
  const factureData = {
    id_facture: factureImportee.id_facture,
    client_id: client.id,
    nom_client: client.nom,
    email_client: client.email,
    montant: Number(factureImportee.montant),
    date_emission: factureImportee.date_emission || new Date().toISOString().split('T')[0],
    date_echeance: factureImportee.date_echeance,
    statut_paiement: factureImportee.statut_paiement || "En attente",
    date_paiement_effective: factureImportee.date_paiement_effective || null,
    pdf_content: factureImportee.pdf_content || null,
    company_id: companyId
  };

  // Mise à jour réactive locale
  if (index > -1) {
    factures.value[index] = factureData;
  } else {
    factures.value.push(factureData);
  }
  sauvegarderFacturesLocalstorageDeSecours();

  // Envoi vers le serveur SQLite
  try {
    if (clientEstNouveau) {
      await fetch(`${BACKEND_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
    }

    await fetch(`${BACKEND_URL}/api/factures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(factureData)
    });
  } catch (e) {
    console.warn('[Store] Facture créée localement (API injoignable).');
  }
}

/**
 * Supprime définitivement une facture
 */
export async function supprimerFacture(idFacture) {
  // 1. Suppression locale réactive
  factures.value = factures.value.filter(f => f.id_facture !== idFacture);
  historiqueRelances.value = historiqueRelances.value.filter(r => r.facture_id !== idFacture);
  sauvegarderFacturesLocalstorageDeSecours();

  // 2. Suppression dans SQLite réel
  try {
    await fetch(`${BACKEND_URL}/api/factures/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_facture: idFacture })
    });
  } catch (e) {
    console.warn('[Store] Facture supprimée localement (API injoignable).');
  }
}

/**
 * Valide le paiement d'une facture et met à jour le scoring
 */
export async function validerFacturePaiement(idFacture, datePaiement) {
  const fac = factures.value.find(f => f.id_facture === idFacture);
  if (!fac) return;

  // 1. Mise à jour réactive locale
  fac.statut_paiement = 'Paye';
  fac.date_paiement_effective = datePaiement;

  const client = clients.value.find(c => c.id === fac.client_id);
  if (client) {
    const dejaEnregistre = client.historique.some(
      h => h.date_echeance === fac.date_echeance && h.date_paiement_effective === datePaiement
    );
    if (!dejaEnregistre) {
      client.historique.push({
        date_echeance: fac.date_echeance,
        date_paiement_effective: datePaiement
      });
    }
  }
  sauvegarderFacturesLocalstorageDeSecours();
  sauvegarderClientsLocalstorageDeSecours();

  // 2. Pousser dans SQLite réel
  try {
    await fetch(`${BACKEND_URL}/api/factures/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_facture: idFacture,
        date_paiement_effective: datePaiement
      })
    });
  } catch (e) {
    console.warn('[Store] Paiement enregistré localement (API injoignable).');
  }
}

// ----------------------------------------------------
// Méthodes d'action Relances
// ----------------------------------------------------

export async function enregistrerRelance(factureId, nomClient, type, sujet, corps, mode = 'Manuel') {
  const companyId = companyActive.value ? companyActive.value.id : 'company-demo';
  const nouvelleRelance = {
    id: `r-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    facture_id: factureId,
    client_nom: nomClient,
    type_relance: type,
    date_envoi: new Date().toISOString(),
    sujet,
    corps,
    mode,
    statut_envoi: 'Envoye',
    company_id: companyId
  };

  // 1. Log local
  historiqueRelances.value.unshift(nouvelleRelance);
  localStorage.setItem('rf_historique_relances', JSON.stringify(historiqueRelances.value));

  // 2. Insertion SQLite réelle
  try {
    await fetch(`${BACKEND_URL}/api/relances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nouvelleRelance)
    });
  } catch (e) {
    console.warn('[Store] Relance loggée localement (API injoignable).');
  }

  return nouvelleRelance;
}

export function executerAutomatisationRelances() {
  if (!emailSettings.value.autoSendEnabled) return { lancees: 0, messages: ["Automatisation désactivée."] };

  const aujourdhui = new Date();
  let relancesLancees = 0;
  const messages = [];

  factures.value.forEach(fac => {
    if (fac.statut_paiement !== 'En attente') return;

    const echeance = new Date(fac.date_echeance);
    const diffTime = aujourdhui.getTime() - echeance.getTime();
    const joursRetard = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (joursRetard >= emailSettings.value.autoSendDelayDays) {
      let typeAEnvoyer = 'Cordial';
      if (joursRetard > 30) {
        typeAEnvoyer = 'Mise en demeure';
      } else if (joursRetard > 15) {
        typeAEnvoyer = 'Ferme';
      }

      const dejaRelancee = historiqueRelances.value.some(
        r => r.facture_id === fac.id_facture && r.type_relance === typeAEnvoyer
      );

      if (!dejaRelancee) {
        const sujet = `[AUTO] Relance ${typeAEnvoyer} - Facture N° ${fac.id_facture}`;
        const corps = `Bonjour ${fac.nom_client},\n\nCeci est un message automatisé du service comptabilité.\nVotre facture N° ${fac.id_facture} d'un montant de ${fac.montant} € est en retard de règlement de ${joursRetard} jours (échéance le ${new Date(fac.date_echeance).toLocaleDateString('fr-FR')}).\n\nMerci de procéder au règlement rapidement.\n\nCordialement,\n${emailSettings.value.senderName}`;

        enregistrerRelance(fac.id_facture, fac.nom_client, typeAEnvoyer, sujet, corps, 'Automatique');
        relancesLancees++;
        messages.push(`Relance automatique (${typeAEnvoyer}) envoyée pour la facture ${fac.id_facture} (${fac.nom_client}).`);
      }
    }
  });

  if (relancesLancees === 0) {
    messages.push("Toutes les factures en retard sont déjà relancées pour leur niveau de retard actuel.");
  }

  return { lancees: relancesLancees, messages };
}

// ----------------------------------------------------
// Méthodes d'action Templates
// ----------------------------------------------------

export async function ajouterOuModifierTemplate(tplData) {
  const companyId = companyActive.value ? companyActive.value.id : 'company-demo';
  const tpl = {
    ...tplData,
    company_id: companyId
  };

  const index = templates.value.findIndex(t => t.id === tpl.id);
  if (index > -1) {
    templates.value[index] = tpl;
  } else {
    templates.value.push(tpl);
  }
  sauvegarderTemplatesLocalstorageDeSecours();

  try {
    await fetch(`${BACKEND_URL}/api/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tpl)
    });
  } catch (e) {
    console.warn('[Store] Modèle sauvegardé localement (API injoignable).');
  }
}

export async function supprimerTemplate(id) {
  templates.value = templates.value.filter(t => t.id !== id);
  sauvegarderTemplatesLocalstorageDeSecours();

  try {
    await fetch(`${BACKEND_URL}/api/templates/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  } catch (e) {
    console.warn('[Store] Modèle supprimé localement (API injoignable).');
  }
}

// ----------------------------------------------------
// Actions d'Authentification / Onboarding B2B
// ----------------------------------------------------

export async function connexionUser(email, password) {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Erreur d'authentification");
  }

  const data = await response.json();
  
  utilisateurConnecte.value = data.user;
  companyActive.value = data.company;
  tokenSession.value = `${data.company.id}:${data.user.id}`; // Session simple

  localStorage.setItem('rf_user', JSON.stringify(data.user));
  localStorage.setItem('rf_company', JSON.stringify(data.company));
  localStorage.setItem('rf_session_token', tokenSession.value);

  // Recharger les données de l'organisation
  await chargerDonneesDepuisBackend();
  return data;
}

export async function finaliserOnboarding(token, password) {
  const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Erreur lors de l'onboarding");
  }

  const data = await response.json();
  
  utilisateurConnecte.value = data.user;
  companyActive.value = data.company;
  tokenSession.value = `${data.company.id}:${data.user.id}`;

  localStorage.setItem('rf_user', JSON.stringify(data.user));
  localStorage.setItem('rf_company', JSON.stringify(data.company));
  localStorage.setItem('rf_session_token', tokenSession.value);

  // Charger les données de la nouvelle organisation
  await chargerDonneesDepuisBackend();
  return data;
}

export function deconnexionUser() {
  utilisateurConnecte.value = null;
  companyActive.value = null;
  tokenSession.value = null;

  localStorage.removeItem('rf_user');
  localStorage.removeItem('rf_company');
  localStorage.removeItem('rf_session_token');

  // Vider les données pour éviter les fuites visuelles
  clients.value = [];
  factures.value = [];
  historiqueRelances.value = [];
  templates.value = [];
}

// ----------------------------------------------------
// Utilitaires LocalStorage de Secours (Fallback)
// ----------------------------------------------------
function chargerDepuisLocalStorageDeSecours() {
  const c = localStorage.getItem('rf_clients');
  const f = localStorage.getItem('rf_factures');
  const s = localStorage.getItem('rf_email_settings');
  const h = localStorage.getItem('rf_historique_relances');
  const t = localStorage.getItem('rf_templates');

  if (c) clients.value = JSON.parse(c);
  if (f) factures.value = JSON.parse(f);
  if (h) historiqueRelances.value = JSON.parse(h);
  if (s) emailSettings.value = JSON.parse(s);
  if (t) templates.value = JSON.parse(t);
}

function sauvegarderClientsLocalstorageDeSecours() {
  localStorage.setItem('rf_clients', JSON.stringify(clients.value));
}

function sauvegarderFacturesLocalstorageDeSecours() {
  localStorage.setItem('rf_factures', JSON.stringify(factures.value));
}

function sauvegarderTemplatesLocalstorageDeSecours() {
  localStorage.setItem('rf_templates', JSON.stringify(templates.value));
}
