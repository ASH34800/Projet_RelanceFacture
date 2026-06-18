<template>
  <div class="invoices-container">
    <header class="invoices-header">
      <div>
        <h1>Factures & Encours</h1>
        <p class="subtitle">Gestion des pièces comptables et pilotage de recouvrement</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="ouvrirImport"><i class="fi fi-bs-download"></i> Importer</button>
        <button class="btn btn-primary" @click="ouvrirCreateClient"><i class="fi fi-bs-plus"></i> Créer une Entreprise</button>
        <button class="btn btn-primary" @click="showInvoiceGeneratorModal = true"><i class="fi fi-bs-plus"></i> Émettre une Facture</button>
      </div>
    </header>

    <!-- Cartes KPI de Synthèse -->
    <section class="invoices-kpi-grid">
      <div class="kpi-mini-card">
        <span class="label">Total Encours</span>
        <span class="value">{{ formaterMontant(statsFactures.totalEncours) }}</span>
      </div>
      <div class="kpi-mini-card danger">
        <span class="label">Total en Retard</span>
        <span class="value">{{ formaterMontant(statsFactures.totalRetard) }}</span>
      </div>
      <div class="kpi-mini-card warning">
        <span class="label">Factures Attente</span>
        <span class="value">{{ statsFactures.nbAttente }}</span>
      </div>
      <div class="kpi-mini-card success">
        <span class="label">Taux Recouvrement</span>
        <span class="value">{{ statsFactures.tauxRecouvrement }}%</span>
      </div>
    </section>

    <!-- Section Filtres & Recherche -->
    <div class="filters-panel-wrapper">
      <div class="filters-panel">
        <div class="search-box">
          <span class="search-icon"><i class="fi fi-bs-search"></i></span>
          <input 
            v-model="recherche" 
            type="text" 
            placeholder="Rechercher par client ou numéro..." 
            class="filter-input"
          />
        </div>
        <div class="filter-tabs">
          <button 
            v-for="status in ['Tous', 'En attente', 'En retard', 'Paye']" 
            :key="status" 
            class="tab-btn"
            :class="{ active: filtreStatut === status }"
            @click="filtreStatut = status"
          >
            {{ formaterLibelleStatut(status) }}
          </button>
        </div>
        <button class="btn btn-secondary btn-sm toggle-filters-btn" @click="showAdvancedFilters = !showAdvancedFilters">
          <i class="fi fi-bs-filter"></i> {{ showAdvancedFilters ? 'Masquer Filtres' : 'Filtres Avancés' }}
        </button>
      </div>

      <!-- Filtres Avancés Optionnels -->
      <div v-if="showAdvancedFilters" class="advanced-filters-panel animate-zoom">
        <div class="filter-row">
          <div class="filter-group">
            <label>Filtrer par Client :</label>
            <select class="form-select select-sm" v-model="filtreClientId">
              <option value="">Tous les clients</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.nom }}</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Date échéance min :</label>
            <input type="date" class="form-control control-sm" v-model="filtreDateDebut" />
          </div>

          <div class="filter-group">
            <label>Date échéance max :</label>
            <input type="date" class="form-control control-sm" v-model="filtreDateFin" />
          </div>

          <div class="filter-group">
            <label>Montant min (€) :</label>
            <input type="number" class="form-control control-sm" v-model.number="filtreMontantMin" placeholder="Ex: 500" />
          </div>

          <div class="filter-group">
            <label>Montant max (€) :</label>
            <input type="number" class="form-control control-sm" v-model.number="filtreMontantMax" placeholder="Ex: 5000" />
          </div>

          <button class="btn btn-secondary btn-sm reset-filters-btn" @click="reinitialiserFiltres" title="Réinitialiser les filtres">
            Effacer
          </button>
        </div>
      </div>
    </div>

    <!-- Tableau des Factures -->
    <div class="panel mt-4">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              </th>
              <th @click="changerTri('id_facture')">N° Facture <span class="sort-icon" v-html="iconeTri('id_facture')"></span></th>
              <th @click="changerTri('nom_client')">Client <span class="sort-icon" v-html="iconeTri('nom_client')"></span></th>
              <th @click="changerTri('date_emission')">Émise le <span class="sort-icon" v-html="iconeTri('date_emission')"></span></th>
              <th @click="changerTri('date_echeance')">Échéance <span class="sort-icon" v-html="iconeTri('date_echeance')"></span></th>
              <th @click="changerTri('montant')">Montant <span class="sort-icon" v-html="iconeTri('montant')"></span></th>
              <th>Pénalités Légales</th>
              <th>Statut</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="facturesFiltrees.length === 0">
              <td colspan="9" class="text-center py-6 text-muted">
                Aucune facture ne correspond à ces critères.
              </td>
            </tr>
            <tr 
              v-for="fac in facturesPageComputed" 
              :key="fac.id_facture"
              :class="{ 'row-warning': fac.joursRetard > 0 && fac.statut_paiement !== 'Paye' }"
            >
              <td style="text-align: center;">
                <input type="checkbox" :value="fac.id_facture" v-model="selectedInvoiceIds" />
              </td>
              <td>
                <span class="invoice-badge">{{ fac.id_facture }}</span>
              </td>
              <td>
                <div class="client-info">
                  <strong>{{ fac.nom_client }}</strong>
                  <span class="client-email">{{ fac.email_client }}</span>
                </div>
              </td>
              <td>{{ formaterDate(fac.date_emission) }}</td>
              <td>{{ formaterDate(fac.date_echeance) }}</td>
              <td class="font-semibold">{{ formaterMontant(fac.montant) }}</td>
              <td>
                <div v-if="fac.joursRetard > 0 && fac.statut_paiement !== 'Paye'" class="legal-fees">
                  <span class="amount">{{ formaterMontant(fac.penalites.totalPenalites) }}</span>
                  <span class="details">(dont 40€ de frais)</span>
                </div>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <div class="status-indicator">
                  <span class="status-dot" :class="classeStatutDot(fac)"></span>
                  <span :class="classeStatutText(fac)">{{ libelleBadge(fac) }}</span>
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <router-link 
                    :to="`/clients/${fac.client_id}`" 
                    class="btn btn-secondary btn-sm"
                    title="Fiche Client"
                  >
                    <i class="fi fi-bs-user"></i> Fiche
                  </router-link>

                  <!-- Boutons PDF -->
                  <button 
                    v-if="fac.pdf_content"
                    class="btn btn-secondary btn-sm"
                    @click="ouvrirPdfModal(fac)"
                    title="Visualiser le PDF"
                  >
                    <i class="fi fi-bs-file-pdf"></i> PDF
                  </button>
                  <button 
                    v-else
                    class="btn btn-secondary btn-sm"
                    @click="importerPdfFacture(fac)"
                    title="Importer le PDF"
                  >
                    <i class="fi fi-bs-upload"></i> + PDF
                  </button>

                  <button 
                    v-if="fac.statut_paiement === 'En attente'"
                    class="btn btn-success btn-sm"
                    @click="ouvrirPayModal(fac)"
                    title="Valider le paiement"
                  >
                    Encaisser
                  </button>

                  <button 
                    v-if="fac.statut_paiement === 'En attente'" 
                    class="btn btn-primary btn-sm"
                    @click="ouvrirRelance(fac)"
                    title="Relancer"
                  >
                    Relancer
                  </button>

                  <button 
                    class="btn btn-secondary btn-sm"
                    @click="confirmerSuppression(fac.id_facture)"
                    title="Supprimer la facture"
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Bar -->
      <div class="pagination-bar" v-if="facturesFiltrees.length > 0">
        <div class="pagination-info">
          Affichage de <strong>{{ indexPremierElement }}</strong> à <strong>{{ indexDernierElement }}</strong> sur <strong>{{ facturesFiltrees.length }}</strong> factures
        </div>
        <div class="pagination-controls">
          <button class="btn btn-secondary btn-sm" :disabled="currentPage === 1" @click="currentPage--">
            Précédent
          </button>
          
          <button 
            v-for="p in pagesVisibles" 
            :key="p" 
            class="page-number-btn"
            :class="{ active: currentPage === p }"
            @click="currentPage = p"
          >
            {{ p }}
          </button>
          
          <button class="btn btn-secondary btn-sm" :disabled="currentPage === totalPages" @click="currentPage++">
            Suivant
          </button>

          <select class="items-per-page-select" v-model="itemsPerPage" @change="currentPage = 1">
            <option :value="10">10 / page</option>
            <option :value="15">15 / page</option>
            <option :value="30">30 / page</option>
            <option :value="50">50 / page</option>
          </select>
        </div>
      </div>
    </div>

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

    <!-- Modal "Créer une Entreprise" -->
    <div v-if="showCreateClientModal" class="modal-overlay">
      <div class="modal-box animate-zoom">
        <div class="modal-header">
          <h3>Fiche Entreprise (Ajout Client)</h3>
          <button class="close-btn" @click="showCreateClientModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nom de l'entreprise :</label>
            <input type="text" class="form-control" v-model="formClient.nom" placeholder="Ex: SAS Hélios" />
          </div>
          <div class="form-group">
            <label>Courriel de facturation :</label>
            <input type="email" class="form-control" v-model="formClient.email" placeholder="compta@helios.fr" />
          </div>
          <div class="form-group">
            <label>Description & Informations Client :</label>
            <textarea rows="4" class="form-control" v-model="formClient.description" placeholder="Notes, secteur d'activité, solvabilité apparente..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCreateClientModal = false">Annuler</button>
          <button class="btn btn-primary" @click="procederCreerClient">Enregistrer l'Entreprise</button>
        </div>
      </div>
    </div>

    <!-- Modal "Créer une Facture" -->
    <div v-if="showCreateInvoiceModal" class="modal-overlay">
      <div class="modal-box animate-zoom">
        <div class="modal-header">
          <h3>Émission d'une nouvelle facture</h3>
          <button class="close-btn" @click="showCreateInvoiceModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Numéro de facture unique :</label>
            <input type="text" class="form-control" v-model="formFacture.id_facture" placeholder="FAC-2026-X" />
          </div>

          <div class="form-group">
            <label>Sélectionner le Client (Entreprise) :</label>
            <select class="form-select" v-model="formFacture.client_id">
              <option value="" disabled>-- Sélectionner une entreprise --</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">
                {{ c.nom }} ({{ c.email }})
              </option>
            </select>
            <p class="field-hint mt-1">Vous ne trouvez pas l'entreprise ? Enregistrez-la d'abord via le bouton « Créer une Entreprise ».</p>
          </div>

          <div class="form-group">
            <label>Montant principal dû (€) :</label>
            <input type="number" class="form-control" v-model="formFacture.montant" min="1" placeholder="3500.00" />
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>Date d'émission :</label>
              <input type="date" class="form-control" v-model="formFacture.date_emission" />
            </div>
            <div class="form-group flex-1">
              <label>Date d'échéance :</label>
              <input type="date" class="form-control" v-model="formFacture.date_echeance" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCreateInvoiceModal = false">Annuler</button>
          <button class="btn btn-success" @click="procederCreerFacture">Émettre la facture</button>
        </div>
      </div>
    </div>

    <!-- Modal "Enregistrer un encaissement" -->
    <div v-if="showPayInvoiceModal" class="modal-overlay">
      <div class="modal-box animate-zoom">
        <div class="modal-header">
          <h3>Encaisser & Valider le paiement</h3>
          <button class="close-btn" @click="showPayInvoiceModal = false">×</button>
        </div>
        <div class="modal-body">
          <p class="mb-4">
            Vous vous apprêtez à valider la facture <strong>{{ factureAPayer.id_facture }}</strong> pour un montant de 
            <strong>{{ formaterMontant(factureAPayer.montant) }}</strong> réglé par <strong>{{ factureAPayer.nom_client }}</strong>.
          </p>
          <div class="form-group">
            <label>Date de règlement effectif :</label>
            <input type="date" class="form-control" v-model="dateReglement" />
            <p class="field-hint mt-1">La date de règlement réelle par rapport à l'échéance recalculera instantanément le score de confiance de l'entreprise.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showPayInvoiceModal = false">Annuler</button>
          <button class="btn btn-success" @click="procederPaiementFacture">Confirmer l'encaissement</button>
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

    <!-- Générateur de facture PDF -->
    <invoice-generator 
      v-if="showInvoiceGeneratorModal" 
      @close="showInvoiceGeneratorModal = false"
      @success="showInvoiceGeneratorModal = false"
    />

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

    <!-- Barre d'actions groupées -->
    <div v-if="selectedInvoiceIds.length > 0" class="bulk-actions-bar animate-zoom">
      <div class="bulk-info">
        <i class="fi fi-bs-info"></i>
        <span><strong>{{ selectedInvoiceIds.length }}</strong> factures sélectionnées</span>
      </div>
      <div class="bulk-buttons">
        <button class="btn btn-primary btn-sm" @click="bulkRelance" title="Relancer la sélection">
          <i class="fi fi-bs-paper-plane"></i> Relancer
        </button>
        <button class="btn btn-success btn-sm" @click="bulkPay" title="Encaisser la sélection">
          <i class="fi fi-bs-check-circle"></i> Encaisser
        </button>
        <button class="btn btn-danger btn-sm" @click="bulkDelete" title="Supprimer la sélection">
          <i class="fi fi-bs-trash"></i> Supprimer
        </button>
        <button class="btn btn-secondary btn-sm" @click="selectedInvoiceIds = []">
          Annuler
        </button>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { clients, factures, enregistrerRelance, emailSettings, ajouterClientManuellement, ajouterFacture, supprimerFacture, validerFacturePaiement } from '../utils/store.js';
import { calculerPenalitesRetard, calculerScoreClient } from '../utils/scoring.js';
import InvoiceGenerator from '../components/InvoiceGenerator.vue';

export default {
  name: 'InvoicesView',
  components: {
    InvoiceGenerator
  },
  setup() {
    const recherche = ref('');
    const filtreStatut = ref('Tous');
    const triChamp = ref('date_echeance');
    const triAscendant = ref(false);

    // Relances Modales
    const showReminderModal = ref(false);
    const factureSelectionnee = ref(null);
    const templateSelectionne = ref('cordiale');
    const emailPrevisualise = ref({ sujet: '', corps: '' });

    const showCreateClientModal = ref(false);
    const showCreateInvoiceModal = ref(false);
    const showPayInvoiceModal = ref(false);
    const showImportModal = ref(false);
    const jsonImportString = ref('');
    const importError = ref('');
    const factureAPayer = ref(null);
    const dateReglement = ref(new Date().toISOString().split('T')[0]);

    // Modales PDF & Générateur
    const showInvoiceGeneratorModal = ref(false);
    const showPdfModal = ref(false);
    const pdfModalInvoiceId = ref('');
    const pdfModalUrl = ref('');

    // Filtres avancés
    const showAdvancedFilters = ref(false);
    const filtreClientId = ref('');
    const filtreDateDebut = ref('');
    const filtreDateFin = ref('');
    const filtreMontantMin = ref(null);
    const filtreMontantMax = ref(null);

    // Pagination
    const currentPage = ref(1);
    const itemsPerPage = ref(15);

    // Sélection multiple pour actions groupées
    const selectedInvoiceIds = ref([]);

    // Formulaires
    const formClient = ref({ nom: '', email: '', description: '' });
    const formFacture = ref({ id_facture: '', client_id: '', montant: 0, date_emission: '', date_echeance: '' });

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

    // Formateurs
    const formaterMontant = (m) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(m);
    const formaterDate = (d) => new Date(d).toLocaleDateString('fr-FR');

    const formaterLibelleStatut = (statut) => {
      if (statut === 'Tous') return 'Toutes';
      if (statut === 'Paye') return 'Payées';
      return statut;
    };

    // Données récapitulatives (KPIs)
    const statsFactures = computed(() => {
      let totalEncours = 0;
      let totalRetard = 0;
      let nbAttente = 0;
      let nbPayees = 0;
      const aujourdhui = new Date();

      factures.value.forEach(f => {
        if (f.statut_paiement === 'En attente') {
          totalEncours += f.montant;
          nbAttente++;
          
          const echeance = new Date(f.date_echeance);
          if (echeance < aujourdhui) {
            totalRetard += f.montant;
          }
        } else if (f.statut_paiement === 'Paye') {
          nbPayees++;
        }
      });

      const totalFactures = factures.value.length;
      const tauxRecouvrement = totalFactures ? Math.round((nbPayees / totalFactures) * 100) : 0;

      return {
        totalEncours,
        totalRetard,
        nbAttente,
        tauxRecouvrement
      };
    });

    // Données enrichies et filtrées
    const facturesFiltrees = computed(() => {
      const aujourdhui = new Date();

      return factures.value
        .map(fac => {
          const client = clients.value.find(c => c.id === fac.client_id) || { historique: [] };
          const echeance = new Date(fac.date_echeance);
          const diffTime = aujourdhui.getTime() - echeance.getTime();
          const joursRetard = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const score = calculerScoreClient(client);

          return {
            ...fac,
            joursRetard: fac.statut_paiement === 'Paye' ? 0 : joursRetard,
            scoreDetails: score,
            penalites: calculerPenalitesRetard(fac.montant, fac.date_echeance)
          };
        })
        .filter(fac => {
          // Filtre Statut
          if (filtreStatut.value === 'En attente') {
            return fac.statut_paiement === 'En attente' && fac.joursRetard <= 0;
          }
          if (filtreStatut.value === 'En retard') {
            return fac.statut_paiement === 'En attente' && fac.joursRetard > 0;
          }
          if (filtreStatut.value === 'Paye') {
            return fac.statut_paiement === 'Paye';
          }
          return true; // Toutes
        })
        .filter(fac => {
          // Filtre Recherche
          if (!recherche.value) return true;
          const query = recherche.value.toLowerCase();
          return fac.nom_client.toLowerCase().includes(query) || fac.id_facture.toLowerCase().includes(query);
        })
        .filter(fac => {
          // Filtres avancés
          if (filtreClientId.value && fac.client_id !== filtreClientId.value) return false;
          if (filtreDateDebut.value && new Date(fac.date_echeance) < new Date(filtreDateDebut.value)) return false;
          if (filtreDateFin.value && new Date(fac.date_echeance) > new Date(filtreDateFin.value)) return false;
          if (filtreMontantMin.value !== null && filtreMontantMin.value !== '' && fac.montant < Number(filtreMontantMin.value)) return false;
          if (filtreMontantMax.value !== null && filtreMontantMax.value !== '' && fac.montant > Number(filtreMontantMax.value)) return false;
          return true;
        })
        .sort((a, b) => {
          // Tri
          let valA = a[triChamp.value];
          let valB = b[triChamp.value];

          if (typeof valA === 'string') {
            return triAscendant.value ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return triAscendant.value ? valA - valB : valB - valA;
        });
    });

    // Pagination de la liste filtrée
    const facturesPageComputed = computed(() => {
      const indexDebut = (currentPage.value - 1) * itemsPerPage.value;
      const indexFin = indexDebut + itemsPerPage.value;
      return facturesFiltrees.value.slice(indexDebut, indexFin);
    });

    const totalPages = computed(() => {
      return Math.ceil(facturesFiltrees.value.length / itemsPerPage.value) || 1;
    });

    const indexPremierElement = computed(() => {
      if (facturesFiltrees.value.length === 0) return 0;
      return (currentPage.value - 1) * itemsPerPage.value + 1;
    });

    const indexDernierElement = computed(() => {
      const end = currentPage.value * itemsPerPage.value;
      return end > facturesFiltrees.value.length ? facturesFiltrees.value.length : end;
    });

    const pagesVisibles = computed(() => {
      const total = totalPages.value;
      const current = currentPage.value;
      const pages = [];
      
      let start = Math.max(1, current - 2);
      let end = Math.min(total, current + 2);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    });

    // Watcher pour réinitialiser la page et la sélection si les filtres changent
    watch([recherche, filtreStatut, filtreClientId, filtreDateDebut, filtreDateFin, filtreMontantMin, filtreMontantMax], () => {
      currentPage.value = 1;
      selectedInvoiceIds.value = [];
    });

    // Réinitialiser les filtres
    const reinitialiserFiltres = () => {
      filtreClientId.value = '';
      filtreDateDebut.value = '';
      filtreDateFin.value = '';
      filtreMontantMin.value = null;
      filtreMontantMax.value = null;
      recherche.value = '';
    };

    // Actions groupées (Bulk Actions)
    const isAllSelected = computed(() => {
      return facturesPageComputed.value.length > 0 && selectedInvoiceIds.value.length === facturesPageComputed.value.length;
    });

    const toggleSelectAll = (e) => {
      if (e.target.checked) {
        selectedInvoiceIds.value = facturesPageComputed.value.map(f => f.id_facture);
      } else {
        selectedInvoiceIds.value = [];
      }
    };

    const bulkPay = async () => {
      if (confirm(`Voulez-vous vraiment encaisser les ${selectedInvoiceIds.value.length} factures sélectionnées ?`)) {
        const dateReglementStr = new Date().toISOString().split('T')[0];
        for (const id of selectedInvoiceIds.value) {
          await validerFacturePaiement(id, dateReglementStr);
        }
        alert("Les factures sélectionnées ont été marquées comme payées.");
        selectedInvoiceIds.value = [];
      }
    };

    const bulkDelete = async () => {
      if (confirm(`Voulez-vous vraiment supprimer définitivement les ${selectedInvoiceIds.value.length} factures sélectionnées ?`)) {
        for (const id of selectedInvoiceIds.value) {
          await supprimerFacture(id);
        }
        alert("Les factures sélectionnées ont été supprimées.");
        selectedInvoiceIds.value = [];
      }
    };

    const bulkRelance = async () => {
      if (confirm(`Voulez-vous vraiment envoyer un e-mail de relance pour les ${selectedInvoiceIds.value.length} factures sélectionnées ?`)) {
        let count = 0;
        const aujourdhui = new Date();
        for (const id of selectedInvoiceIds.value) {
          const fac = factures.value.find(f => f.id_facture === id);
          if (!fac || fac.statut_paiement !== 'En attente') continue;

          // Déterminer le modèle selon le retard
          const echeance = new Date(fac.date_echeance);
          const diffTime = aujourdhui.getTime() - echeance.getTime();
          const joursRetard = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let type = 'Cordial';
          let template = templatesMail.cordiale;
          if (joursRetard > 30) {
            type = 'Mise en demeure';
            template = templatesMail.mise_en_demeure;
          } else if (joursRetard > 15) {
            type = 'Ferme';
            template = templatesMail.ferme;
          }

          const totalPenalites = calculerPenalitesRetard(fac.montant, fac.date_echeance).totalPenalites;
          const totalDu = fac.montant + totalPenalites;

          const sujet = template.sujet
            .replace(/{NUMERO_FACTURE}/g, fac.id_facture)
            .replace(/{NOM_CLIENT}/g, fac.nom_client);

          const corps = template.corps
            .replace(/{NUMERO_FACTURE}/g, fac.id_facture)
            .replace(/{NOM_CLIENT}/g, fac.nom_client)
            .replace(/{MONTANT}/g, formaterMontant(fac.montant))
            .replace(/{DATE_ECHEANCE}/g, formaterDate(fac.date_echeance))
            .replace(/{PENALITES}/g, formaterMontant(totalPenalites))
            .replace(/{MONTANT_TOTAL}/g, formaterMontant(totalDu));

          // Log de relance
          enregistrerRelance(fac.id_facture, fac.nom_client, type, sujet, corps, 'Manuel');

          // Envoi SMTP
          try {
            await fetch('http://localhost:3002/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                senderEmail: emailSettings.value.senderEmail,
                senderName: emailSettings.value.senderName,
                recipientEmail: fac.email_client,
                subject: sujet,
                body: corps
              })
            });
            count++;
          } catch (e) {
            // Ignoré
          }
        }
        alert(`${count} e-mails de relance envoyés avec succès (relances écrites dans received_emails/).`);
        selectedInvoiceIds.value = [];
      }
    };

    // Tri dynamique
    const changerTri = (champ) => {
      if (triChamp.value === champ) {
        triAscendant.value = !triAscendant.value;
      } else {
        triChamp.value = champ;
        triAscendant.value = true;
      }
    };

    const iconeTri = (champ) => {
      if (triChamp.value !== champ) return '<i class="fi fi-bs-sort"></i>';
      return triAscendant.value ? '<i class="fi fi-bs-angle-up"></i>' : '<i class="fi fi-bs-angle-down"></i>';
    };

    // Badges graphiques
    const classeStatutDot = (fac) => {
      if (fac.statut_paiement === 'Paye') return 'success';
      if (fac.joursRetard > 0) return 'danger';
      return 'pending';
    };

    const classeStatutText = (fac) => {
      if (fac.statut_paiement === 'Paye') return 'success-text';
      if (fac.joursRetard > 0) return 'danger-text';
      return 'warning-text';
    };

    const libelleBadge = (fac) => {
      if (fac.statut_paiement === 'Paye') return 'Payée';
      if (fac.joursRetard > 0) return `En retard (+${fac.joursRetard}j)`;
      return 'En attente';
    };

    // Actions Modales
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

    const ouvrirCreateClient = () => {
      formClient.value = { nom: '', email: '', description: '' };
      showCreateClientModal.value = true;
    };

    const ouvrirCreateInvoice = () => {
      formFacture.value = { 
        id_facture: `FAC-2026-${Math.floor(100 + Math.random() * 900)}`,
        client_id: '',
        montant: 0,
        date_emission: new Date().toISOString().split('T')[0],
        date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // J+30
      };
      showCreateInvoiceModal.value = true;
    };

    const ouvrirPayModal = (fac) => {
      factureAPayer.value = fac;
      dateReglement.value = new Date().toISOString().split('T')[0];
      showPayInvoiceModal.value = true;
    };

    // Procédures d'action
    const procederCreerClient = () => {
      if (!formClient.value.nom || !formClient.value.email) {
        alert("Le nom et l'adresse courriel sont obligatoires.");
        return;
      }
      ajouterClientManuellement(formClient.value);
      showCreateClientModal.value = false;
      alert("Entreprise ajoutée avec succès.");
    };

    const procederCreerFacture = () => {
      if (!formFacture.value.client_id || formFacture.value.montant <= 0) {
        alert("Veuillez sélectionner une entreprise et entrer un montant valide.");
        return;
      }

      const client = clients.value.find(c => c.id === formFacture.value.client_id);
      if (!client) return;

      const newInvoiceData = {
        id_facture: formFacture.value.id_facture,
        nom_client: client.nom,
        email_client: client.email,
        montant: Number(formFacture.value.montant),
        date_emission: formFacture.value.date_emission,
        date_echeance: formFacture.value.date_echeance,
        statut_paiement: "En attente"
      };

      ajouterFacture(newInvoiceData);
      showCreateInvoiceModal.value = false;
      alert("Nouvelle facture émise.");
    };

    const procederPaiementFacture = () => {
      if (!dateReglement.value) {
        alert("La date de règlement est requise.");
        return;
      }
      validerFacturePaiement(factureAPayer.value.id_facture, dateReglement.value);
      showPayInvoiceModal.value = false;
      alert("Encaissement validé. Le score de l'entreprise a été recalculé.");
    };

    const confirmerSuppression = (idFacture) => {
      if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement la facture ${idFacture} ?`)) {
        supprimerFacture(idFacture);
        alert("Facture supprimée.");
      }
    };

    const mettreAJourTemplate = () => {
      if (!factureSelectionnee.value) return;

      const template = templatesMail[templateSelectionne.value];
      const fac = factureSelectionnee.value;
      const totalPenalites = fac.penalites ? fac.penalites.totalPenalites : 0;
      const totalDu = fac.montant + totalPenalites;

      let sujet = template.sujet
        .replace(/{NUMERO_FACTURE}/g, fac.id_facture)
        .replace(/{NOM_CLIENT}/g, fac.nom_client);

      let corps = template.corps
        .replace(/{NUMERO_FACTURE}/g, fac.id_facture)
        .replace(/{NOM_CLIENT}/g, fac.nom_client)
        .replace(/{MONTANT}/g, formaterMontant(fac.montant))
        .replace(/{DATE_ECHEANCE}/g, formaterDate(fac.date_echeance))
        .replace(/{PENALITES}/g, formaterMontant(totalPenalites))
        .replace(/{MONTANT_TOTAL}/g, formaterMontant(totalDu));

      emailPrevisualise.value = { sujet, corps };
    };

    const envoyerRelance = async () => {
      const fac = factureSelectionnee.value;
      const typeLabel = templateSelectionne.value === 'cordiale' ? 'Cordial' : (templateSelectionne.value === 'ferme' ? 'Ferme' : 'Mise en demeure');
      
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
          alert(`[Relance Réelle] E-mail relayé et écrit dans received_emails/ via le serveur de messagerie local (port 1025) !`);
        } else {
          throw new Error();
        }
      } catch (e) {
        alert(`[Simulation SMTP] Relance enregistrée localement avec succès.\nNote : Le serveur dev-backend.js n'a pas pu être joint, l'envoi réel est simulé.`);
      }

      fermerRelance();
    };

    const ouvrirImport = () => {
      showImportModal.value = true;
    };

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
      filtreStatut,
      facturesFiltrees,
      showReminderModal,
      showCreateClientModal,
      showCreateInvoiceModal,
      showPayInvoiceModal,
      showImportModal,
      jsonImportString,
      importError,
      factureSelectionnee,
      factureAPayer,
      dateReglement,
      templateSelectionne,
      emailPrevisualise,
      formClient,
      formFacture,
      clients,
      changerTri,
      iconeTri,
      classeStatutDot,
      classeStatutText,
      libelleBadge,
      ouvrirRelance,
      fermerRelance,
      ouvrirCreateClient,
      ouvrirCreateInvoice,
      ouvrirPayModal,
      procederCreerClient,
      procederCreerFacture,
      procederPaiementFacture,
      procederImportation,
      confirmerSuppression,
      mettreAJourTemplate,
      envoyerRelance,
      ouvrirImport,
      formaterMontant,
      formaterDate,
      formaterLibelleStatut,
      emailSettings,
      showInvoiceGeneratorModal,
      showPdfModal,
      pdfModalInvoiceId,
      pdfModalUrl,
      ouvrirPdfModal,
      fermerPdfModal,
      importerPdfFacture,
      statsFactures,
      facturesPageComputed,
      showAdvancedFilters,
      filtreClientId,
      filtreDateDebut,
      filtreDateFin,
      filtreMontantMin,
      filtreMontantMax,
      currentPage,
      itemsPerPage,
      selectedInvoiceIds,
      totalPages,
      indexPremierElement,
      indexDernierElement,
      pagesVisibles,
      reinitialiserFiltres,
      isAllSelected,
      toggleSelectAll,
      bulkPay,
      bulkDelete,
      bulkRelance
    };
  }
};
</script>

<style scoped>
.invoices-container {
  padding: 2.5rem;
  background-color: var(--bg-dark);
  color: var(--text-main);
  min-height: 100vh;
}

.invoices-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.invoices-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-top: 0.2rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.glass {
  background: var(--bg-panel);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
}

/* Filtres */
.filters-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-glass);
}

.search-icon {
  color: var(--text-muted);
}

.filter-input {
  background: none;
  border: none;
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
  width: 280px;
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
}

.tab-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: rgba(15, 23, 42, 0.04);
  color: var(--text-main);
}

.tab-btn.active {
  background: var(--primary-gradient);
  color: white;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.15);
}

/* Data Table custom styles */
.panel {
  padding: 1.5rem;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 1rem;
  border-bottom: 1px solid var(--border-glass);
  color: var(--text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  user-select: none;
}

.data-table th:hover {
  color: var(--text-main);
}

.sort-icon {
  margin-left: 0.25rem;
  font-size: 0.7rem;
}

.data-table td {
  padding: 1.1rem 1rem;
  border-bottom: 1px solid var(--border-glass);
  font-size: 0.9rem;
  vertical-align: middle;
}

.data-table tbody tr:hover {
  background: rgba(15, 23, 42, 0.015);
}

.row-warning {
  background: rgba(239, 68, 68, 0.015);
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
  color: var(--text-muted);
}

.badge {
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success {
  background: rgba(52, 211, 153, 0.15);
  color: var(--success-color);
}

.badge-danger {
  background: rgba(248, 113, 113, 0.15);
  color: var(--danger-color);
}

.badge-pending {
  background: rgba(251, 191, 36, 0.15);
  color: var(--warning-color);
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
  color: var(--text-muted);
}

/* Boutons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.btn-secondary {
  background: #ffffff;
  color: var(--text-main);
  border: 1px solid var(--border-glass);
}

.btn-secondary:hover {
  background: rgba(15, 23, 42, 0.04);
}

.btn-success {
  background: var(--success-color);
  color: white;
}

.btn-success:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-danger {
  background: var(--danger-color);
  color: white;
}

.btn-danger:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  border-radius: 6px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 0.85rem;
}

.action-buttons {
  display: flex;
  gap: 0.35rem;
}

/* Modals */
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
  max-width: 650px;
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
  border-bottom: 1px solid var(--border-glass);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
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
  border-top: 1px solid var(--border-glass);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
}

.form-control {
  width: 100%;
  background: #ffffff;
  border: 1px solid #D1D5DB;
  color: #111827;
  font-weight: 500;
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
  font-size: 0.95rem;
  box-sizing: border-box;
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
  background: #ffffff;
  border: 1px solid #D1D5DB;
  color: #111827;
  font-weight: 500;
  padding: 0.65rem 0.8rem;
  border-radius: 8px;
}

.textarea-body {
  line-height: 1.5;
  font-family: inherit;
}

.placeholders-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: rgba(15, 23, 42, 0.02);
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--border-glass);
}

.placeholders-hint code {
  color: #818cf8;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

.animate-zoom {
  animation: zoom 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes zoom {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.mt-1 { margin-top: 0.25rem; }
.mt-4 { margin-top: 1rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.text-center { text-align: center; }
.text-muted { color: var(--text-muted); }
.font-semibold { font-weight: 600; }
.field-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Cartes KPI Factures */
.invoices-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.kpi-mini-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
.kpi-mini-card .label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}
.kpi-mini-card .value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-main);
}
.kpi-mini-card.danger { border-left: 4px solid var(--danger-color); }
.kpi-mini-card.warning { border-left: 4px solid var(--warning-color); }
.kpi-mini-card.success { border-left: 4px solid var(--success-color); }

/* Filtres Avancés */
.filters-panel-wrapper {
  margin-bottom: 1.5rem;
}
.toggle-filters-btn {
  white-space: nowrap;
}
.advanced-filters-panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  padding: 1.25rem;
  margin-top: 0.75rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
}
.filter-row {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 150px;
  flex: 1;
}
.filter-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}
.control-sm, .select-sm {
  padding: 0.45rem 0.6rem !important;
  font-size: 0.85rem !important;
  border-radius: 6px !important;
}
.reset-filters-btn {
  padding: 0.45rem 1rem;
  font-size: 0.85rem;
  cursor: pointer;
  height: fit-content;
}

/* Pagination */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-glass);
  flex-wrap: wrap;
  gap: 1rem;
}
.pagination-info {
  font-size: 0.9rem;
  color: var(--text-muted);
}
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.page-number-btn {
  background: white;
  border: 1px solid var(--border-glass);
  color: var(--text-main);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.2s;
}
.page-number-btn:hover {
  background: rgba(15, 23, 42, 0.04);
}
.page-number-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}
.items-per-page-select {
  padding: 0.35rem 1.75rem 0.35rem 0.5rem;
  font-size: 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--border-glass);
  background-color: white;
  margin-left: 0.5rem;
  cursor: pointer;
}

/* Actions groupées (Bulk Actions) */
.bulk-actions-bar {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #1e1b4b; /* Assorti au thème sombre navy */
  color: white;
  padding: 0.85rem 2rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  z-index: 90;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.bulk-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}
.bulk-info i {
  font-size: 1.1rem;
  color: #818cf8;
}
.bulk-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.bulk-buttons .btn {
  font-size: 0.85rem;
  padding: 0.5rem 1rem;
}
</style>
