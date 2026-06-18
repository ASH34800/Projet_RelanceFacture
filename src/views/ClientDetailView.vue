<template>
  <div class="client-detail-container" v-if="client">
    <header class="client-header">
      <router-link to="/factures" class="back-link">
        <span><i class="fi fi-bs-arrow-left"></i></span> Retour aux factures
      </router-link>
      <div class="header-main mt-2">
        <div>
          <h1>{{ client.nom }}</h1>
          <p class="subtitle">Identifiant client : {{ client.id }} • Courriel : {{ client.email }}</p>
        </div>
        <div class="header-score">
          <div class="circular-score" :style="{ borderColor: scoreDetails.couleur }">
            <span class="score-num" :style="{ color: scoreDetails.couleur }">{{ scoreDetails.score }}</span>
            <span class="score-den">/100</span>
          </div>
          <div class="score-meta">
            <span class="risk-badge" :style="{ backgroundColor: scoreDetails.couleur + '15', color: scoreDetails.couleur }">
              Risque {{ scoreDetails.niveauRisque }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- KPIs Spécifiques du Client -->
    <div class="kpis-row mt-4">
      <div class="kpi-card">
        <div class="kpi-val">{{ formaterMontant(clientKpis.balanceRestante) }}</div>
        <div class="kpi-lbl">Balance restante due</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val warning-text">{{ formaterMontant(clientKpis.totalEnRetard) }}</div>
        <div class="kpi-lbl">Montant total en retard</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">{{ scoreDetails.delaiMoyen }} jours</div>
        <div class="kpi-lbl">Délai moyen de retard historique</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">{{ formaterMontant(clientKpis.penalitesEstimees) }}</div>
        <div class="kpi-lbl">Pénalités moratoires cumulées</div>
      </div>
    </div>

    <!-- Section de Détails et Historique -->
    <div class="details-grid mt-4">
      <!-- Liste des factures de ce client -->
      <div class="panel flex-2">
        <h2 class="panel-title">Factures de ce client</h2>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>N° Facture</th>
                <th>Émission</th>
                <th>Échéance</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Retard</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="facturesClient.length === 0">
                <td colspan="6" class="text-center py-6 text-muted">Aucune facture enregistrée pour ce client.</td>
              </tr>
              <tr v-for="fac in facturesClient" :key="fac.id_facture">
                <td><span class="invoice-badge">{{ fac.id_facture }}</span></td>
                <td>{{ formaterDate(fac.date_emission) }}</td>
                <td>{{ formaterDate(fac.date_echeance) }}</td>
                <td class="font-semibold">{{ formaterMontant(fac.montant) }}</td>
                <td>
                  <div class="status-indicator">
                    <span class="status-dot" :class="fac.statut_paiement === 'Paye' ? 'success' : (fac.joursRetard > 0 ? 'danger' : 'pending')"></span>
                    <span :class="fac.statut_paiement === 'Paye' ? 'success-text' : (fac.joursRetard > 0 ? 'danger-text' : 'warning-text')">
                      {{ fac.statut_paiement === 'Paye' ? 'Payée' : (fac.joursRetard > 0 ? 'En retard' : 'En attente') }}
                    </span>
                  </div>
                </td>
                <td class="text-muted">
                  <span v-if="fac.statut_paiement === 'Paye'">Règlée</span>
                  <span v-else-if="fac.joursRetard > 0" class="danger-text">+{{ fac.joursRetard }} jours</span>
                  <span v-else>J-{{ Math.abs(fac.joursRetard) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Historique des règlements passés -->
      <div class="panel flex-1">
        <h2 class="panel-title">Historique des règlements passés (Scoring)</h2>
        <div class="history-timeline">
          <div v-if="client.historique.length === 0" class="empty-state">
            <p>Aucun paiement passé disponible pour nourrir l'algorithme.</p>
          </div>
          <div 
            v-for="(reg, index) in historiqueTrie" 
            :key="index" 
            class="timeline-item"
          >
            <div class="timeline-dot" :class="calculerJoursRetard(reg) > 0 ? 'dot-danger' : 'dot-success'"></div>
            <div class="timeline-content">
              <span class="timeline-date">{{ formaterDate(reg.date_paiement_effective) }}</span>
              <p>Règlement reçu pour l'échéance du {{ formaterDate(reg.date_echeance) }}</p>
              <span class="timeline-meta" :class="calculerJoursRetard(reg) > 0 ? 'danger-text' : 'success-text'">
                {{ calculerJoursRetard(reg) > 0 ? `Payé avec ${calculerJoursRetard(reg)} jour(s) de retard` : 'Payé à temps' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section Historique des Relances Envoyées -->
    <div class="details-grid mt-4">
      <div class="panel flex-1">
        <h2 class="panel-title"><i class="fi fi-bs-time-past"></i> Historique des Relances Envoyées (Mails)</h2>
        <div class="history-timeline">
          <div v-if="relancesClient.length === 0" class="empty-state">
            <p>Aucun e-mail de relance n'a été envoyé à ce client.</p>
          </div>
          <div 
            v-for="rel in relancesClient" 
            :key="rel.id" 
            class="timeline-item"
          >
            <div class="timeline-dot dot-primary"></div>
            <div class="timeline-content">
              <span class="timeline-date">{{ formaterDate(rel.date_envoi) }} à {{ formaterHeure(rel.date_envoi) }}</span>
              <p>
                <strong>Relance {{ rel.type_relance }}</strong> (Mode : {{ rel.mode }})
              </p>
              <span class="timeline-meta text-muted">
                Facture : <code>{{ rel.facture_id }}</code> • Sujet : <em>{{ rel.sujet }}</em>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="client-detail-container" v-else>
    <div class="panel text-center py-6">
      <p>Client introuvable.</p>
      <router-link to="/factures" class="btn btn-secondary mt-2">Retour aux factures</router-link>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { clients, factures, historiqueRelances } from '../utils/store.js';
import { calculerScoreClient, calculerPenalitesRetard } from '../utils/scoring.js';

export default {
  name: 'ClientDetailView',
  props: {
    id: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const client = computed(() => {
      return clients.value.find(c => c.id === props.id);
    });

    const scoreDetails = computed(() => {
      if (!client.value) return { score: 100, delaiMoyen: 0, niveauRisque: 'Faible', couleur: '#10b981' };
      return calculerScoreClient(client.value);
    });

    const facturesClient = computed(() => {
      const aujourdhui = new Date();
      return factures.value
        .filter(fac => fac.client_id === props.id)
        .map(fac => {
          const echeance = new Date(fac.date_echeance);
          const diffTime = aujourdhui.getTime() - echeance.getTime();
          const joursRetard = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return {
            ...fac,
            joursRetard: fac.statut_paiement === 'Paye' ? 0 : joursRetard
          };
        });
    });

    const historiqueTrie = computed(() => {
      if (!client.value) return [];
      return [...client.value.historique].sort((a, b) => new Date(b.date_paiement_effective) - new Date(a.date_paiement_effective));
    });

    const relancesClient = computed(() => {
      if (!client.value) return [];
      return historiqueRelances.value
        .filter(r => r.client_nom.toLowerCase() === client.value.nom.toLowerCase())
        .sort((a, b) => new Date(b.date_envoi) - new Date(a.date_envoi));
    });

    const clientKpis = computed(() => {
      let balanceRestante = 0;
      let totalEnRetard = 0;
      let penalitesEstimees = 0;

      facturesClient.value.forEach(fac => {
        if (fac.statut_paiement === 'En attente') {
          balanceRestante += fac.montant;
          if (fac.joursRetard > 0) {
            totalEnRetard += fac.montant;
            const penalites = calculerPenalitesRetard(fac.montant, fac.date_echeance);
            penalitesEstimees += penalites.totalPenalites;
          }
        }
      });

      return {
        balanceRestante,
        totalEnRetard,
        penalitesEstimees
      };
    });

    // Utilitaires
    const formaterMontant = (m) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(m);
    const formaterDate = (d) => new Date(d).toLocaleDateString('fr-FR');
    const formaterHeure = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    const calculerJoursRetard = (reg) => {
      const echeance = new Date(reg.date_echeance);
      const effective = new Date(reg.date_paiement_effective);
      const diffTime = effective.getTime() - echeance.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    };

    return {
      client,
      scoreDetails,
      facturesClient,
      historiqueTrie,
      relancesClient,
      clientKpis,
      formaterMontant,
      formaterDate,
      formaterHeure,
      calculerJoursRetard
    };
  }
};
</script>

<style scoped>
.client-detail-container {
  padding: 2.5rem;
  background-color: var(--bg-dark);
  color: var(--text-main);
  min-height: 100vh;
}

.back-link {
  color: #818cf8;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transition: transform 0.2s ease;
}

.back-link:hover {
  transform: translateX(-3px);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.header-main h1 {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-top: 0.2rem;
}

.header-score {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.circular-score {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 4px solid #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.score-num {
  font-size: 1.5rem;
  font-weight: 800;
}

.score-den {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.3rem;
}

.risk-badge {
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
}

.glass {
  background: var(--bg-panel);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
}

/* KPIs grid */
.kpis-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.kpi-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.kpi-val {
  font-size: 1.6rem;
  font-weight: 700;
}

.kpi-lbl {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.warning-text {
  color: var(--warning-color);
}

/* details layout */
.details-grid {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.flex-1 { flex: 1; min-width: 300px; }
.flex-2 { flex: 2; min-width: 450px; }

.panel {
  padding: 1.5rem;
}

.panel-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

/* Timeline */
.history-timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 400px;
  overflow-y: auto;
  position: relative;
  padding-left: 1rem;
}

.timeline-item {
  position: relative;
  padding-left: 1.5rem;
  border-left: 2px solid var(--border-glass);
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: absolute;
  left: -7px;
  top: 4px;
}

.dot-success { background-color: var(--success-color); box-shadow: 0 0 6px var(--success-color); }
.dot-danger { background-color: var(--danger-color); box-shadow: 0 0 6px var(--danger-color); }
.dot-primary { background-color: var(--primary-color); box-shadow: 0 0 6px var(--primary-color); }

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.85rem;
}

.timeline-date {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
}

.timeline-meta {
  font-size: 0.75rem;
  font-weight: 600;
}

.success-text { color: #10b981; }
.danger-text { color: #ef4444; }

/* Table specific */
.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, .data-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-glass);
  font-size: 0.85rem;
}

.data-table th {
  color: var(--text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
}

.invoice-badge {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-weight: 600;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
}

.badge-success { background: rgba(52, 211, 153, 0.15); color: var(--success-color); }
.badge-danger { background: rgba(248, 113, 113, 0.15); color: var(--danger-color); }
.badge-pending { background: rgba(251, 191, 36, 0.15); color: var(--warning-color); }

.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.btn-secondary {
  background: #ffffff;
  color: var(--text-main);
  border: 1px solid var(--border-glass);
}
.btn-secondary:hover {
  background: rgba(15, 23, 42, 0.04);
}

.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.text-center { text-align: center; }
.text-muted { color: var(--text-muted); }
.font-semibold { font-weight: 600; }
</style>
