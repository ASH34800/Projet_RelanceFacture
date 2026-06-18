<template>
  <div class="dashboard-container">
    <!-- Header principal -->
    <header class="dashboard-header">
      <div class="header-brand">
        <div class="logo-icon"><i class="fi fi-bs-chart-histogram"></i></div>
        <div>
          <h1>RelanceFacture MVP</h1>
          <p class="subtitle">Prévention et scoring prédictif des retards de paiement</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="showImportModal = true">
          <span><i class="fi fi-bs-download"></i></span> Importer des factures
        </button>
      </div>
    </header>

    <!-- Grid des KPIs Globaux -->
    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon pending"><i class="fi fi-bs-time-quarter-to"></i></div>
        <div class="kpi-details">
          <span class="kpi-label">Factures en attente</span>
          <span class="kpi-value">{{ formaterMontant(kpis.totalEnAttente) }}</span>
          <span class="kpi-trend">{{ kpis.nbFacturesEnAttente }} facture(s) active(s)</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon unpaid"><i class="fi fi-bs-siren-on"></i></div>
        <div class="kpi-details">
          <span class="kpi-label">Encours en retard (> J0)</span>
          <span class="kpi-value warning-text">{{ formaterMontant(kpis.totalImpayes) }}</span>
          <span class="kpi-trend danger-text">{{ kpis.nbFacturesEnRetard }} facture(s) en souffrance</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon delay"><i class="fi fi-bs-clock"></i></div>
        <div class="kpi-details">
          <span class="kpi-label">Délai moyen de retard</span>
          <span class="kpi-value">{{ kpis.delaiMoyenGeneral }} jours</span>
          <span class="kpi-trend">Sur l'ensemble de la clientèle</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon score"><i class="fi fi-bs-shield-check"></i></div>
        <div class="kpi-details">
          <span class="kpi-label">Score de confiance moyen</span>
          <span class="kpi-value" :style="{ color: couleurScoreGeneral(kpis.scoreMoyenGeneral) }">
            {{ kpis.scoreMoyenGeneral }}/100
          </span>
          <span class="kpi-trend">Indice de santé globale</span>
        </div>
      </div>
    </section>

    <!-- Graphique d'Évolution et Section d'Alertes -->
    <div class="dashboard-analytics-grid">
      <!-- Vue Graphique Simplifiée CSS -->
      <div class="panel flex-2">
        <div class="panel-header-row">
          <h2 class="panel-title mb-0">Volume d'impayés</h2>
          <select v-model="graphGranularity" class="form-select" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.85rem;">
            <option value="mois">Par Mois</option>
            <option value="annee">Par Année</option>
            <option value="semaine">Par Semaine</option>
          </select>
        </div>
        <div class="chart-container" style="margin-top: 1rem;">
          <div class="bar-chart">
            <div 
              v-for="mois in graphMoisData" 
              :key="mois.label" 
              class="chart-bar-wrapper"
              @click="ouvrirDetailsPeriode(mois)"
              style="cursor: pointer;"
            >
              <div class="chart-bar-tooltip">
                <strong>{{ formaterMontant(mois.montant) }}</strong> en retard<br>
                <span>{{ mois.nb }} facture(s)</span>
              </div>
              <div class="chart-bar-track">
                <div 
                  class="chart-bar-fill" 
                  :style="{ height: `${mois.pourcentage}%` }"
                ></div>
              </div>
              <span class="chart-bar-label">{{ mois.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section des Alertes Prédictives -->
      <div class="panel flex-1">
        <h2 class="panel-title">Alertes Prédictives & Risque</h2>
        <div class="alerts-list">
          <div v-if="alertesLog.length === 0" class="empty-state">
            <p>Aucune alerte à haut risque détectée.</p>
          </div>
          <div 
            v-for="(alerte, index) in alertesLog" 
            :key="index" 
            class="alert-card"
            :class="alerte.type"
          >
            <div class="alert-icon">
              <span v-if="alerte.type === 'danger'"><i class="fi fi-bs-cross-circle"></i></span>
              <span v-else><i class="fi fi-bs-triangle-warning"></i></span>
            </div>
            <div class="alert-content">
              <strong>{{ alerte.clientNom }}</strong>
              <p>{{ alerte.message }}</p>
              <span class="alert-meta">Pénalités estimées : {{ formaterMontant(alerte.penalitesTotal) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tableau de Relances Prioritaires -->
    <section class="panel mt-6">
      <div class="panel-header-row">
        <h2 class="panel-title">Factures à relancer en priorité</h2>
        <div class="table-filters">
          <input 
            v-model="recherche" 
            type="text" 
            placeholder="Rechercher un client..." 
            class="filter-input"
          />
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Facture</th>
              <th>Client</th>
              <th>Échéance</th>
              <th>Retard</th>
              <th>Montant</th>
              <th>Score de Risque</th>
              <th>Pénalités Légales</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="facturesPrioritaires.length === 0">
              <td colspan="8" class="text-center py-6 text-muted">
                Aucune facture en attente ou en retard à relancer.
              </td>
            </tr>
            <tr 
              v-for="fac in facturesPrioritaires" 
              :key="fac.id_facture"
              :class="{ 'row-warning': fac.joursRetard > 0 }"
            >
              <td>
                <span class="invoice-badge">{{ fac.id_facture }}</span>
              </td>
              <td>
                <div class="client-info">
                  <strong>{{ fac.nom_client }}</strong>
                  <span class="client-email">{{ fac.email_client }}</span>
                </div>
              </td>
              <td>{{ formaterDate(fac.date_echeance) }}</td>
              <td>
                <div v-if="fac.joursRetard > 0" class="status-indicator">
                  <span class="status-dot danger"></span>
                  <span class="danger-text">Retard (+{{ fac.joursRetard }}j)</span>
                </div>
                <div v-else class="status-indicator">
                  <span class="status-dot success"></span>
                  <span class="text-muted">J-{{ Math.abs(fac.joursRetard) }}</span>
                </div>
              </td>
              <td class="font-semibold">{{ formaterMontant(fac.montant) }}</td>
              <td>
                <div class="score-indicator-inline">
                  <div 
                    class="score-dot" 
                    :style="{ backgroundColor: fac.scoreDetails.couleur }"
                  ></div>
                  <span>{{ fac.scoreDetails.score }}/100</span>
                  <span class="score-label">({{ fac.scoreDetails.niveauRisque }})</span>
                </div>
              </td>
              <td>
                <div v-if="fac.joursRetard > 0" class="legal-fees">
                  <span class="amount">{{ formaterMontant(fac.penalites.totalPenalites) }}</span>
                  <span class="details">(dont 40€ de frais)</span>
                </div>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <div class="action-buttons">
                  <button 
                    v-if="fac.pdf_content"
                    class="btn btn-secondary btn-sm" 
                    @click="ouvrirPdfModal(fac)"
                    title="Visualiser la facture PDF"
                  >
                    <i class="fi fi-bs-file-pdf"></i>
                  </button>
                  <button 
                    v-else
                    class="btn btn-secondary btn-sm" 
                    @click="importerPdfFacture(fac)"
                    title="Associer un PDF"
                  >
                    <i class="fi fi-bs-upload"></i>
                  </button>
                  <button 
                    class="btn btn-primary btn-sm" 
                    @click="ouvrirRelance(fac)"
                  >
                    Relancer
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>


    <!-- Modal d'Envoi d'e-mail de Relance -->
    <div v-if="showReminderModal" class="modal-overlay">
      <div class="modal-box animate-zoom">
        <div class="modal-header">
          <h3>Rédiger un mail de relance</h3>
          <button class="close-btn" @click="fermerRelance">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="template-select">Modèle de relance :</label>
            <select 
              id="template-select" 
              v-model="templateSelectionne" 
              class="form-select"
              @change="mettreAJourTemplate"
            >
              <option value="cordiale">Relance cordiale (Rappel amical)</option>
              <option value="ferme">Rappel ferme (Mise en garde et pénalités)</option>
              <option value="mise_en_demeure">Mise en demeure (Action juridique)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Destinataire :</label>
            <input 
              type="email" 
              class="form-control" 
              v-model="factureSelectionnee.email_client" 
              disabled
            />
          </div>

          <div class="form-group">
            <label>Objet du mail :</label>
            <input 
              type="text" 
              class="form-control font-semibold" 
              v-model="emailPrevisualise.sujet"
            />
          </div>

          <div class="form-group">
            <label>Contenu du message :</label>
            <textarea 
              rows="8" 
              class="form-control textarea-body" 
              v-model="emailPrevisualise.corps"
            ></textarea>
          </div>

          <div class="placeholders-hint">
            <strong>Variables dynamiques insérées :</strong> 
            <code>{NOM_CLIENT}</code>, <code>{NUMERO_FACTURE}</code>, <code>{MONTANT}</code>, <code>{DATE_ECHEANCE}</code>, <code>{PENALITES}</code>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="fermerRelance">Annuler</button>
          <button class="btn btn-success" @click="envoyerRelance">
            <i class="fi fi-bs-paper-plane"></i> Envoyer le mail
          </button>
        </div>
      </div>
    </div>

    <!-- Modal d'Importation JSON/CSV -->
    <div v-if="showImportModal" class="modal-overlay">
      <div class="modal-box animate-zoom">
        <div class="modal-header">
          <h3>Importer des données de facturation</h3>
          <button class="close-btn" @click="showImportModal = false">×</button>
        </div>
        <div class="modal-body">
          <p class="mb-4">Collez ci-dessous le fichier JSON d'importation standardisé contenant les données de factures et d'historique clients.</p>
          <textarea 
            v-model="jsonImportString" 
            rows="10" 
            class="form-control code-area" 
            placeholder='[
  {
    "id_facture": "FAC-2026-105",
    "nom_client": "Société Dupont",
    "email_client": "compta@dupont.fr",
    "montant": 3200.00,
    "date_emission": "2026-05-01",
    "date_echeance": "2026-05-30",
    "statut_paiement": "En attente",
    "historique_paiements_passes": [
      { "date_echeance": "2026-03-01", "date_paiement_effective": "2026-03-03" }
    ]
  }
]'
          ></textarea>
          <p v-if="importError" class="error-text mt-2">{{ importError }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showImportModal = false">Fermer</button>
          <button class="btn btn-primary" @click="procederImportation">Valider l'importation</button>
        </div>
      </div>
    </div>

    <!-- Modal Détails de Période -->
    <div v-if="showPeriodDetailsModal" class="modal-overlay">
      <div class="modal-box animate-zoom" style="max-width: 800px;">
        <div class="modal-header">
          <h3>Factures en retard : {{ selectedPeriod?.label }}</h3>
          <button class="close-btn" @click="showPeriodDetailsModal = false">×</button>
        </div>
        <div class="modal-body" style="max-height: 60vh; overflow-y: auto; padding: 0;">
          <div v-if="!selectedPeriod || selectedPeriod.factures.length === 0" class="empty-state" style="padding: 2rem;">
            <p>Aucune facture en retard sur cette période.</p>
          </div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>Facture</th>
                <th>Client</th>
                <th>Échéance</th>
                <th>Montant</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="fac in selectedPeriod.factures" :key="fac.id_facture">
                <td><span class="invoice-badge">{{ fac.id_facture }}</span></td>
                <td><strong>{{ fac.nom_client }}</strong></td>
                <td>{{ formaterDate(fac.date_echeance) }}</td>
                <td class="font-semibold">{{ formaterMontant(fac.montant) }}</td>
                <td>
                  <button 
                    v-if="fac.pdf_content"
                    class="btn btn-secondary btn-sm" 
                    @click="ouvrirPdfModal(fac); showPeriodDetailsModal = false"
                    title="Voir PDF"
                    style="margin-right: 0.5rem;"
                  >
                    <i class="fi fi-bs-file-pdf"></i>
                  </button>
                  <button class="btn btn-primary btn-sm" @click="ouvrirRelance(fac); showPeriodDetailsModal = false">
                    Relancer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showPeriodDetailsModal = false">Fermer</button>
        </div>
      </div>
    </div>
    <!-- Modal de Visualisation PDF -->
    <div v-if="showPdfModal" class="modal-overlay">
      <div class="modal-box animate-zoom" style="max-width: 900px; width: 95%;">
        <div class="modal-header">
          <h3>Visualisation de la Facture : {{ pdfModalInvoiceId }}</h3>
          <button class="close-btn" @click="fermerPdfModal">×</button>
        </div>
        <div class="modal-body" style="padding: 0; height: 75vh; max-height: none; background: #525659;">
          <iframe 
            v-if="pdfModalUrl" 
            :src="pdfModalUrl" 
            width="100%" 
            height="100%" 
            style="border: none;"
          ></iframe>
          <div v-else class="empty-state" style="padding: 3rem; color: white;">
            <p>Erreur : Aucun contenu PDF trouvé.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="fermerPdfModal">Fermer</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { calculerScoreClient, calculerPenalitesRetard, genererAlertePredictive } from '../utils/scoring.js';
import { clients, factures, ajouterFacture, emailSettings, enregistrerRelance } from '../utils/store.js';

export default {
  name: 'Dashboard',
  setup() {
    // ----------------------------------------------------
    // États de l'Application
    // ----------------------------------------------------
    const recherche = ref('');
    const showReminderModal = ref(false);
    const showImportModal = ref(false);
    const showPeriodDetailsModal = ref(false);
    const selectedPeriod = ref(null);
    const graphGranularity = ref('mois');
    const jsonImportString = ref('');
    const importError = ref('');
    const factureSelectionnee = ref(null);
    const templateSelectionne = ref('cordiale');
    const emailPrevisualise = ref({ sujet: '', corps: '' });

    // Modales PDF
    const showPdfModal = ref(false);
    const pdfModalInvoiceId = ref('');
    const pdfModalUrl = ref('');

    // Modèles d'e-mail avec Placeholders
    const templatesMail = {
      cordiale: {
        sujet: "Rappel amiable : Règlement de votre facture {NUMERO_FACTURE}",
        corps: "Bonjour,\n\nSauf erreur ou omission de notre part, le règlement de la facture N° {NUMERO_FACTURE} d'un montant de {MONTANT} €, échue le {DATE_ECHEANCE}, ne nous est pas parvenu.\n\nNous vous remercions de bien vouloir régulariser cette situation rapidement.\n\nCordialement,\nLe service financier."
      },
      ferme: {
        sujet: "Rappel formel : Facture N° {NUMERO_FACTURE} en retard de paiement",
        corps: "Bonjour,\n\nMalgré un précédent message, nous constatons que la facture N° {NUMERO_FACTURE} d'un montant de {MONTANT} € reste impayée à ce jour.\n\nNous vous rappelons que conformément à l'article L441-10 du Code de commerce, des pénalités de retard d'un montant de {PENALITES} € ont été calculées et sont exigibles, accompagnées d'une indemnité de recouvrement forfaitaire de 40 €.\n\nNous vous prions de procéder au virement sous 48 heures afin d'éviter toute mesure additionnelle.\n\nCordialement,\nLe service financier."
      },
      mise_en_demeure: {
        sujet: "MISE EN DEMEURE - Facture N° {NUMERO_FACTURE} - Action juridique requise",
        corps: "Madame, Monsieur,\n\nEn dépit de nos multiples relances concernant la facture N° {NUMERO_FACTURE} d'un montant de {MONTANT} € échue depuis plus de 30 jours, nous sommes toujours en attente du règlement.\n\nPar la présente, nous vous mettons officiellement en demeure de nous verser le montant principal dû plus les pénalités accumulées, soit un montant total exigible de {MONTANT_TOTAL} € (comprenant {PENALITES} € d'intérêts moratoires et d'indemnité légale de 40 €).\n\nA défaut de réception sous 8 jours ouvrables, nous transmettrons votre dossier à notre cabinet de recouvrement.\n\nSentiments distingués,\nLa direction administrative."
      }
    };

    // ----------------------------------------------------
    // Fonctions d'Affichage / Utilitaires
    // ----------------------------------------------------
    const formaterMontant = (montant) => {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);
    };

    const formaterDate = (dateStr) => {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    };

    const formaterHeure = (dateStr) => {
      return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const couleurScoreGeneral = (score) => {
      if (score >= 75) return '#10b981'; // Vert
      if (score >= 40) return '#f59e0b'; // Orange
      return '#ef4444'; // Rouge
    };

    // ----------------------------------------------------
    // Propriétés Calculées (Calculs KPIs & Algorithmes)
    // ----------------------------------------------------
    const facturesPrioritaires = computed(() => {
      const aujourdhui = new Date();
      
      return factures.value
        .map(fac => {
          const clientAssocie = clients.value.find(c => c.id === fac.client_id) || { historique: [], nom: fac.nom_client };
          const scoreDetails = calculerScoreClient(clientAssocie);

          // Calcul du retard
          const echeance = new Date(fac.date_echeance);
          const diffTime = aujourdhui.getTime() - echeance.getTime();
          const joursRetard = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Calcul des pénalités
          const penalites = calculerPenalitesRetard(fac.montant, fac.date_echeance);

          return {
            ...fac,
            joursRetard: fac.statut_paiement === 'Paye' ? 0 : joursRetard,
            scoreDetails,
            penalites
          };
        })
        .filter(fac => fac.statut_paiement === 'En attente')
        // Tri par retard et sévérité de risque
        .sort((a, b) => b.joursRetard - a.joursRetard || a.scoreDetails.score - b.scoreDetails.score)
        .filter(fac => {
          if (!recherche.value) return true;
          return fac.nom_client.toLowerCase().includes(recherche.value.toLowerCase());
        });
    });

    const kpis = computed(() => {
      let totalEnAttente = 0;
      let totalImpayes = 0;
      let nbFacturesEnAttente = 0;
      let nbFacturesEnRetard = 0;
      
      const aujourdhui = new Date();

      factures.value.forEach(fac => {
        if (fac.statut_paiement === 'En attente') {
          totalEnAttente += fac.montant;
          nbFacturesEnAttente++;

          const echeance = new Date(fac.date_echeance);
          if (echeance < aujourdhui) {
            totalImpayes += fac.montant;
            nbFacturesEnRetard++;
          }
        }
      });

      // Calcul du score moyen des clients
      let sommeScores = 0;
      let sommeDelais = 0;
      
      clients.value.forEach(c => {
        const stats = calculerScoreClient(c);
        sommeScores += stats.score;
        sommeDelais += stats.delaiMoyen;
      });

      const scoreMoyenGeneral = clients.value.length ? Math.round(sommeScores / clients.value.length) : 100;
      const delaiMoyenGeneral = clients.value.length ? Number((sommeDelais / clients.value.length).toFixed(1)) : 0;

      return {
        totalEnAttente,
        totalImpayes,
        nbFacturesEnAttente,
        nbFacturesEnRetard,
        scoreMoyenGeneral,
        delaiMoyenGeneral
      };
    });

    // Alertes Prédictives
    const alertesLog = computed(() => {
      const alertes = [];
      
      factures.value.forEach(fac => {
        if (fac.statut_paiement === 'Paye') return;
        
        const client = clients.value.find(c => c.id === fac.client_id);
        if (!client) return;

        const alerte = genererAlertePredictive(fac, client);
        if (alerte) {
          const penalites = calculerPenalitesRetard(fac.montant, fac.date_echeance);
          alertes.push({
            ...alerte,
            clientNom: client.nom,
            penalitesTotal: penalites.totalPenalites
          });
        }
      });

      // Trier par priorité critique
      return alertes.sort((a, b) => a.priorite - b.priorite);
    });

    // Graphique : Répartition dynamique de retards (Vue agenda sans trous)
    const graphMoisData = computed(() => {
      const facturesRetard = factures.value.filter(f => f.statut_paiement === 'En attente');
      const groupes = {};

      // Déterminer la date de fin de la fenêtre (aujourd'hui ou la facture la plus lointaine)
      let maxDate = new Date();
      if (facturesRetard.length > 0) {
        const dates = facturesRetard.map(f => new Date(f.date_echeance));
        const maxFactureDate = new Date(Math.max(...dates));
        if (maxFactureDate > maxDate) {
          maxDate = maxFactureDate;
        }
      }

      // 1. Génération du squelette "Agenda" (sans trous) pour la granularité choisie
      if (graphGranularity.value === 'mois') {
        // 12 derniers mois se terminant à maxDate
        const currentDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
        for (let i = 0; i < 12; i++) {
          const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }).replace('.', '');
          groupes[key] = { key, label, montant: 0, nb: 0, factures: [] };
        }
      } else if (graphGranularity.value === 'semaine') {
        // 12 dernières semaines
        for (let i = 0; i < 12; i++) {
          const d = new Date(maxDate.getTime() - i * 7 * 86400000);
          const firstDay = new Date(d.getFullYear(), 0, 1);
          const pastDaysOfYear = (d - firstDay) / 86400000;
          const weekNum = Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
          const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
          const label = `S${weekNum} '${String(d.getFullYear()).substr(2)}`;
          if (!groupes[key]) groupes[key] = { key, label, montant: 0, nb: 0, factures: [] };
        }
      } else if (graphGranularity.value === 'annee') {
        // 5 dernières années
        const maxYear = maxDate.getFullYear();
        for (let i = 0; i < 5; i++) {
          const year = maxYear - i;
          const key = `${year}`;
          const label = `${year}`;
          groupes[key] = { key, label, montant: 0, nb: 0, factures: [] };
        }
      }

      // 2. Remplissage avec les données réelles
      facturesRetard.forEach(fac => {
        const date = new Date(fac.date_echeance);
        let key = '';

        if (graphGranularity.value === 'mois') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else if (graphGranularity.value === 'annee') {
          key = `${date.getFullYear()}`;
        } else if (graphGranularity.value === 'semaine') {
          const firstDay = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear = (date - firstDay) / 86400000;
          const weekNum = Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
          key = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        }

        // Ajouter uniquement si la date fait partie de la fenêtre générée
        if (groupes[key]) {
          groupes[key].montant += fac.montant;
          groupes[key].nb += 1;
          groupes[key].factures.push(fac);
        }
      });

      // 3. Tri chronologique et formatage final
      let data = Object.values(groupes).sort((a, b) => a.key.localeCompare(b.key));
      
      const maxMontant = Math.max(...data.map(m => m.montant), 1);
      return data.map(m => ({
        ...m,
        pourcentage: (m.montant / maxMontant) * 100
      }));
    });

    // ----------------------------------------------------
    // Actions Relance E-mail
    // ----------------------------------------------------
    const ouvrirRelance = (fac) => {
      factureSelectionnee.value = fac;
      templateSelectionne.value = fac.joursRetard > 15 ? 'ferme' : (fac.joursRetard > 30 ? 'mise_en_demeure' : 'cordiale');
      mettreAJourTemplate();
      showReminderModal.value = true;
    };

    const fermerRelance = () => {
      showReminderModal.value = false;
      factureSelectionnee.value = null;
    };

    const ouvrirDetailsPeriode = (periode) => {
      selectedPeriod.value = periode;
      showPeriodDetailsModal.value = true;
    };

    const mettreAJourTemplate = () => {
      if (!factureSelectionnee.value) return;

      const template = templatesMail[templateSelectionne.value];
      const fac = factureSelectionnee.value;
      const client = clients.value.find(c => c.id === fac.client_id) || { nom: fac.nom_client };
      
      const totalPenalites = fac.penalites ? fac.penalites.totalPenalites : 0;
      const totalDu = fac.montant + totalPenalites;

      // Remplacement des placeholders
      let sujet = template.sujet
        .replace(/{NUMERO_FACTURE}/g, fac.id_facture)
        .replace(/{NOM_CLIENT}/g, client.nom);

      let corps = template.corps
        .replace(/{NUMERO_FACTURE}/g, fac.id_facture)
        .replace(/{NOM_CLIENT}/g, client.nom)
        .replace(/{MONTANT}/g, formaterMontant(fac.montant))
        .replace(/{DATE_ECHEANCE}/g, formaterDate(fac.date_echeance))
        .replace(/{PENALITES}/g, formaterMontant(totalPenalites))
        .replace(/{MONTANT_TOTAL}/g, formaterMontant(totalDu));

      emailPrevisualise.value = { sujet, corps };
    };

    const envoyerRelance = async () => {
      const fac = factureSelectionnee.value;
      const typeLabel = templateSelectionne.value === 'cordiale' ? 'Cordial' : (templateSelectionne.value === 'ferme' ? 'Ferme' : 'Mise en demeure');
      
      // Enregistrer dans l'historique persistent du store
      enregistrerRelance(
        fac.id_facture,
        fac.nom_client,
        typeLabel,
        emailPrevisualise.value.sujet,
        emailPrevisualise.value.corps,
        'Manuel'
      );

      try {
        const response = await fetch('http://localhost:3002/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderEmail: emailSettings.value.senderEmail,
            senderName: emailSettings.value.senderName,
            recipientEmail: fac.email_client,
            subject: emailPrevisualise.value.sujet,
            body: emailPrevisualise.value.corps
          })
        });

        if (response.ok) {
          alert(`[Relance Réelle] E-mail relayé et écrit avec succès dans received_emails/ via le serveur de messagerie local (port 1025) !`);
        } else {
          throw new Error();
        }
      } catch (e) {
        // En cas d'échec de contact avec le serveur de test local
        alert(`[Simulation SMTP] Relance enregistrée localement avec succès.\nNote : Le serveur dev-backend.js n'a pas pu être contacté, l'envoi réel est simulé.`);
      }

      fermerRelance();
    };



    // ----------------------------------------------------
    // Actions Importation
    // ----------------------------------------------------
    const procederImportation = () => {
      try {
        const parsed = JSON.parse(jsonImportString.value);
        if (!Array.isArray(parsed)) {
          throw new Error("Le format doit être un tableau d'objets.");
        }

        parsed.forEach((item, index) => {
          if (!item.id_facture || !item.nom_client || !item.email_client || !item.montant || !item.date_echeance) {
            throw new Error(`L'élément à l'index ${index} manque de propriétés obligatoires.`);
          }
        });

        // Mise à jour de la base de données réactive globale
        parsed.forEach(importedItem => {
          ajouterFacture(importedItem);
        });

        showImportModal.value = false;
        jsonImportString.value = '';
        importError.value = '';
        alert("Données importées avec succès.");

      } catch (err) {
        importError.value = `Erreur de validation : ${err.message}`;
      }
    };

    const ouvrirPdfModal = (fac) => {
      pdfModalInvoiceId.value = fac.id_facture;
      pdfModalUrl.value = fac.pdf_content || '';
      showPdfModal.value = true;
    };

    const fermerPdfModal = () => {
      showPdfModal.value = false;
      pdfModalInvoiceId.value = '';
      pdfModalUrl.value = '';
    };

    const importerPdfFacture = (fac) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          const base64 = evt.target.result;
          const updatedFac = {
            ...fac,
            pdf_content: base64
          };
          ajouterFacture(updatedFac);
          alert(`Fichier PDF associé avec succès à la facture ${fac.id_facture} !`);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    };



    return {
      recherche,
      facturesPrioritaires,
      kpis,
      alertesLog,
      graphMoisData,
      graphGranularity,
      showReminderModal,
      showImportModal,
      showPeriodDetailsModal,
      selectedPeriod,
      jsonImportString,
      importError,
      factureSelectionnee,
      templateSelectionne,
      emailPrevisualise,
      ouvrirRelance,
      fermerRelance,
      ouvrirDetailsPeriode,
      mettreAJourTemplate,
      envoyerRelance,
      procederImportation,
      formaterMontant,
      formaterDate,
      formaterHeure,
      couleurScoreGeneral,
      emailSettings,
      showPdfModal,
      pdfModalInvoiceId,
      pdfModalUrl,
      ouvrirPdfModal,
      fermerPdfModal,
      importerPdfFacture
    };
  }
};
</script>

<style scoped>
/* variables locales (design haut de gamme) */
.dashboard-container {
  --font-family: 'Outfit', 'Inter', sans-serif;
  --bg-color: var(--bg-dark);
  --text-primary: var(--text-main);
  --text-secondary: var(--text-muted);
  --panel-bg: var(--bg-panel);
  --panel-border: var(--border-glass);
  --border-radius: 16px;
  
  font-family: var(--font-family);
  background-color: var(--bg-color);
  color: var(--text-primary);
  padding: 2.5rem;
  min-height: 100vh;
  box-sizing: border-box;
}

/* Glassmorphism panels */
.glass {
  background: var(--panel-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--panel-border);
  border-radius: var(--border-radius);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02);
}

/* Header styling */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-icon {
  font-size: 2.5rem;
  background: var(--primary-gradient);
  padding: 0.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

.dashboard-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.025em;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin: 0.2rem 0 0 0;
}

/* Button UI */
.btn {
  font-family: var(--font-family);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 0.9rem;
}

.btn-primary {
  background: var(--primary-gradient);
  color: #ffffff;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.btn-secondary {
  background: #ffffff;
  color: var(--text-primary);
  border: 1px solid var(--panel-border);
}

.btn-secondary:hover {
  background: rgba(15, 23, 42, 0.04);
}

.btn-success {
  background: var(--success-color);
  color: white;
}

.btn-success:hover {
  background: #059669;
  transform: translateY(-2px);
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  border-radius: 6px;
}

/* KPI Card Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
}

.kpi-icon {
  font-size: 2rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.03);
}
.kpi-icon.pending { background: rgba(245, 158, 11, 0.1); color: var(--warning-color); }
.kpi-icon.unpaid { background: rgba(239, 68, 68, 0.1); color: var(--danger-color); }
.kpi-icon.delay { background: rgba(79, 70, 229, 0.1); color: var(--primary-color); }
.kpi-icon.score { background: rgba(16, 185, 129, 0.1); color: var(--success-color); }

.kpi-details {
  display: flex;
  flex-direction: column;
}

.kpi-label {
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0.25rem 0;
}

.kpi-trend {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.warning-text {
  color: var(--warning-color);
}

.danger-text {
  color: var(--danger-color);
}

/* Analytics section */
.dashboard-analytics-grid {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.flex-1 { flex: 1; min-width: 300px; }
.flex-2 { flex: 2; min-width: 400px; }
.flex-col { display: flex; flex-direction: column; }

.panel {
  padding: 1.5rem;
}

.panel-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 1.25rem;
  letter-spacing: -0.01em;
}

.section-subtitle {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--panel-border);
  padding-bottom: 0.4rem;
}

/* Bar chart custom CSS */
.chart-container {
  height: 220px;
  display: flex;
  align-items: flex-end;
  padding-top: 2rem;
}

.bar-chart {
  display: flex;
  width: 100%;
  justify-content: space-between;
  height: 100%;
  align-items: flex-end;
  border-bottom: 2px solid var(--panel-border);
}

.chart-bar-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12%;
  cursor: pointer;
}

.chart-bar-track {
  width: 100%;
  height: 140px;
  background: rgba(15, 23, 42, 0.03);
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.chart-bar-fill {
  width: 100%;
  background: var(--primary-gradient);
  border-radius: 6px 6px 0 0;
  transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.chart-bar-wrapper:hover .chart-bar-fill {
  filter: brightness(1.2);
}

.chart-bar-label {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.chart-bar-tooltip {
  position: absolute;
  bottom: 160px;
  background: #ffffff;
  color: var(--text-primary);
  border: 1px solid var(--panel-border);
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.25s ease;
  z-index: 10;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.chart-bar-wrapper:hover .chart-bar-tooltip {
  opacity: 1;
  transform: translateY(0);
}

/* Alerts styling */
.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 220px;
  overflow-y: auto;
}

.alert-card {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 10px;
  border-left: 4px solid transparent;
  font-size: 0.85rem;
}

.alert-card.danger {
  background: rgba(239, 68, 68, 0.08);
  border-left-color: var(--danger-color);
}

.alert-card.warning {
  background: rgba(245, 158, 11, 0.08);
  border-left-color: var(--warning-color);
}

.alert-content strong {
  display: block;
  margin-bottom: 0.2rem;
}

.alert-content p {
  margin: 0;
  color: var(--text-primary);
}

.alert-meta {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Data Table UI */
.panel-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-input {
  background: #ffffff;
  border: 1px solid var(--panel-border);
  color: var(--text-primary);
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-family: var(--font-family);
  font-size: 0.9rem;
  width: 250px;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th, .data-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--panel-border);
  font-size: 0.9rem;
}

.data-table th {
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.data-table tbody tr {
  transition: background 0.2s ease;
}

.data-table tbody tr:hover {
  background: rgba(15, 23, 42, 0.015);
}

.row-warning {
  background: rgba(245, 158, 11, 0.02);
}

.invoice-badge {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.8rem;
}

.client-info {
  display: flex;
  flex-direction: column;
}

.client-email {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger-color);
}

.badge-success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success-color);
}

.score-indicator-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.score-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.score-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.legal-fees {
  display: flex;
  flex-direction: column;
}

.legal-fees .amount {
  font-weight: 600;
  color: var(--warning-color);
}

.legal-fees .details {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

/* Modals layout */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.modal-box {
  width: 90%;
  max-width: 600px;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid var(--border-glass);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--panel-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
  max-height: 450px;
  overflow-y: auto;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--panel-border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Forms controls */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: var(--text-main);
}

.form-control {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  color: #111827;
  transition: all 0.2s;
}

.form-control::placeholder {
  color: #9CA3AF;
  font-weight: 400;
}

.form-control:focus {
  outline: none;
  border-color: #6366f1;
}

.form-select {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  color: #111827;
}

.textarea-body {
  line-height: 1.5;
}

.placeholders-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: rgba(15, 23, 42, 0.02);
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--panel-border);
}

.placeholders-hint code {
  color: #818cf8;
}

.code-area {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.8rem;
  background: #f8fafc;
  color: #0f172a;
  border: 1px solid var(--panel-border);
}

.error-text {
  color: var(--danger-color);
  font-size: 0.8rem;
}

/* Custom design: toggle switch */
.toggle-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggle-text {
  display: flex;
  flex-direction: column;
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  flex-shrink: 0;
}

.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.08);
  transition: .4s;
  border: 1px solid rgba(15, 23, 42, 0.1);
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background: var(--primary-gradient);
}

input:focus + .slider {
  box-shadow: 0 0 1px #6366f1;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.form-row {
  display: flex;
  gap: 1rem;
}

.w-full { width: 100%; }
.justify-center { justify-content: center; }

/* Reminders Log styling */
.sent-reminders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 480px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.reminder-log-card {
  background: #ffffff;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: 1rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.reminder-log-card:hover {
  background: rgba(15, 23, 42, 0.01);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.log-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.log-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.log-badge.automatique {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.log-badge.manuel {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success-color);
}

.log-type {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.log-type.cordial {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success-color);
}

.log-type.ferme {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.log-type.mise_en_demeure {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.log-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-left: auto;
}

.log-body {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.log-subject {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.log-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  border-top: 1px solid var(--panel-border);
  padding-top: 0.5rem;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.success {
  background-color: var(--success-color);
  box-shadow: 0 0 6px var(--success-color);
}

/* Animations */
.animate-zoom {
  animation: zoom 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes zoom {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }
.mb-4 { margin-bottom: 1rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.text-center { text-align: center; }
.text-muted { color: var(--text-secondary); }
.font-semibold { font-weight: 600; }
</style>
