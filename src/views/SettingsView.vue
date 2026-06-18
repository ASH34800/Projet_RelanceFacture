<template>
  <div class="settings-container">
    <header class="settings-header">
      <div>
        <h1>Paramètres & Historique</h1>
        <p class="subtitle">Configuration du moteur de relance et journal d'activité</p>
      </div>
    </header>

    <div class="dashboard-analytics-grid mt-6">
      <!-- Panneau Paramètres SMTP & Automation -->
      <div class="panel flex-1 flex-col">
        <h2 class="panel-title"><i class="fi fi-bs-settings"></i> Paramètres E-mail & Automatisation</h2>
        
        <div class="form-group toggle-group">
          <label class="switch">
            <input type="checkbox" v-model="emailSettings.autoSendEnabled" />
            <span class="slider round"></span>
          </label>
          <div class="toggle-text">
            <strong>Relance automatique active</strong>
            <span class="field-hint">Envoie les mails en arrière-plan</span>
          </div>
        </div>

        <div class="form-group mt-2">
          <label>Seuil de relance automatique (jours après échéance) :</label>
          <input type="number" class="form-control" v-model="emailSettings.autoSendDelayDays" min="1" />
        </div>

        <div class="panel-header-row mt-4">
          <h3 class="section-subtitle">Configuration Serveur SMTP</h3>
          <button class="btn btn-secondary btn-sm" @click="configurerLocalhost"><i class="fi fi-bs-plug"></i> Charger Localhost</button>
        </div>
        
        <div class="form-row mt-2">
          <div class="form-group flex-2">
            <label>Serveur d'envoi SMTP :</label>
            <input type="text" class="form-control" v-model="emailSettings.smtpHost" placeholder="smtp.sendgrid.net" />
          </div>
          <div class="form-group flex-1">
            <label>Port SMTP :</label>
            <input type="number" class="form-control" v-model="emailSettings.smtpPort" />
          </div>
        </div>

        <div class="form-group">
          <label>Adresse mail d'expédition (Sender) :</label>
          <input type="email" class="form-control" v-model="emailSettings.senderEmail" placeholder="compta@entreprise.com" />
        </div>

        <div class="form-group">
          <label>Nom d'expéditeur affiché :</label>
          <input type="text" class="form-control" v-model="emailSettings.senderName" placeholder="Service Finance ACME" />
        </div>

        <div class="form-group">
          <label>Clé d'API / Mot de passe SMTP :</label>
          <input type="password" class="form-control" v-model="emailSettings.smtpPass" placeholder="••••••••••••••••" />
        </div>

        <div class="action-buttons mt-4 w-full">
          <button class="btn btn-primary w-full justify-center" @click="lancerAutomatisation">
            Lancer l'automate maintenant
          </button>
        </div>
      </div>

      <!-- Panneau Historique de Suivi des Relances -->
      <div class="panel flex-2">
        <div class="panel-header-row">
          <h2 class="panel-title" style="margin-bottom: 0;"><i class="fi fi-bs-time-past"></i> Historique de Suivi des Relances (Mails Envoyés)</h2>
          <button class="btn btn-danger btn-sm" @click="viderHistorique">Vider l'historique</button>
        </div>
        <div class="sent-reminders-list">
          <div v-if="historiqueRelances.length === 0" class="empty-state">
            <p>Aucun e-mail de relance n'a encore été envoyé ou automatisé.</p>
          </div>
          <div 
            v-for="r in historiqueRelances" 
            :key="r.id" 
            class="reminder-log-card animate-zoom"
          >
            <div class="log-header">
              <span class="log-badge" :class="r.mode.toLowerCase()">
                {{ r.mode }}
              </span>
              <span class="log-type" :class="r.type_relance.toLowerCase().replace(/\s/g, '_')">
                {{ r.type_relance }}
              </span>
              <span class="log-date">{{ formaterDate(r.date_envoi) }} à {{ formaterHeure(r.date_envoi) }}</span>
            </div>
            <div class="log-body mt-2">
              <strong>Destinataire : {{ r.client_nom }}</strong> (Facture : <code>{{ r.facture_id }}</code>)
              <p class="log-subject mt-1">Sujet : <em>{{ r.sujet }}</em></p>
            </div>
            <div class="log-status mt-2">
              <span class="status-dot success"></span>
              <span class="status-text">Simulé et Validé via SMTP ({{ emailSettings.smtpHost }})</span>
            </div>
          </div>
          </div>
        </div>
      </div>

      <!-- Panneau Modèles de Factures -->
      <div class="panel mt-6 w-full">
        <div class="panel-header-row">
          <h2 class="panel-title" style="margin-bottom: 0;"><i class="fi fi-bs-file-invoice-dollar"></i> Modèles de Facture PDF</h2>
          <button class="btn btn-primary btn-sm" @click="ouvrirCreerTemplate"><i class="fi fi-bs-plus"></i> Nouveau Modèle</button>
        </div>

        <div class="templates-grid mt-4">
          <div v-for="t in templates" :key="t.id" class="template-card animate-zoom">
            <div class="template-card-header" :style="{ borderTopColor: t.primary_color }">
              <span class="template-layout-badge">{{ formaterLayoutType(t.layout_type) }}</span>
              <div class="template-color-dot" :style="{ backgroundColor: t.primary_color }"></div>
            </div>
            <div class="template-card-body">
              <h3 class="template-name">{{ t.nom }}</h3>
              <p class="template-footer-preview" v-if="t.footer_text">
                <strong>Bas de page :</strong> {{ t.footer_text }}
              </p>
              <div v-if="t.logo_base64" class="template-logo-preview-container">
                <img :src="t.logo_base64" class="template-logo-preview" alt="Logo" />
              </div>
              <div v-else class="template-no-logo">Aucun logo configuré</div>
            </div>
            <div class="template-card-actions">
              <button class="btn btn-secondary btn-sm" @click="ouvrirModifierTemplate(t)"><i class="fi fi-bs-edit"></i> Modifier</button>
              <button class="btn btn-danger btn-sm" @click="supprimerTemplateClick(t.id)"><i class="fi fi-bs-trash"></i> Supprimer</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Panneau Administration Alpha (Uniquement visible pour les Admins Généraux de company-demo) -->
      <div v-if="isAdmin" class="panel mt-6 w-full">
        <div class="panel-header-row">
          <h2 class="panel-title" style="margin-bottom: 0;"><i class="fi fi-bs-shield-check"></i> Administration des Accès Alpha Privés</h2>
          <button class="btn btn-secondary btn-sm" @click="chargerAlphaRequests"><i class="fi fi-bs-refresh"></i> Rafraîchir</button>
        </div>

        <div class="table-responsive mt-4">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Date de Demande</th>
                <th>Demandeur</th>
                <th>Entreprise</th>
                <th>Volume Factures / Mois</th>
                <th>Adresse Email</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="alphaRequests.length === 0">
                <td colspan="7" class="text-center text-muted py-4">
                  Aucune demande d'accès reçue pour le moment.
                </td>
              </tr>
              <tr v-for="req in alphaRequests" :key="req.id" class="admin-row">
                <td>{{ formaterDate(req.date_creation) }}</td>
                <td><strong>{{ req.nom_complet }}</strong></td>
                <td>{{ req.nom_entreprise }}</td>
                <td><span class="badge-volume">{{ req.volume_factures }}</span></td>
                <td><code>{{ req.email }}</code></td>
                <td>
                  <span class="status-badge" :class="req.statut">
                    {{ formaterStatutAlpha(req.statut) }}
                  </span>
                </td>
                <td class="actions-cell">
                  <div v-if="req.statut === 'en_attente'" class="btn-group">
                    <button class="btn btn-primary btn-sm" @click="validerDemande(req.id)">
                      Valider
                    </button>
                    <button class="btn btn-danger btn-sm" @click="rejeterDemande(req.id)">
                      Rejeter
                    </button>
                  </div>
                  <div v-else-if="req.statut === 'valide'">
                    <button class="btn btn-secondary btn-sm" @click="copierLienOnboarding(req.token)">
                      <i class="fi fi-bs-copy"></i> Copier l'invitation
                    </button>
                  </div>
                  <div v-else class="text-muted italic text-sm">
                    Aucune action requise
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

  <!-- Modal Créer/Modifier Modèle -->
  <div v-if="showTemplateModal" class="modal-overlay">
    <div class="modal-box animate-zoom">
      <div class="modal-header">
        <h3>{{ isEditMode ? 'Modifier le modèle' : 'Créer un modèle' }}</h3>
        <button class="close-btn" @click="showTemplateModal = false">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nom du modèle :</label>
          <input type="text" class="form-control" v-model="currentTemplate.nom" placeholder="Ex: Modèle Indigo Professionnel" />
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Style structurel (Layout) :</label>
            <select class="form-select" v-model="currentTemplate.layout_type">
              <option value="colored_header">En-tête coloré</option>
              <option value="minimalist">Minimaliste Épuré</option>
              <option value="bold_accent">Ligne d'accentuation colorée</option>
            </select>
          </div>

          <div class="form-group flex-1">
            <label>Couleur principale :</label>
            <div class="color-input-wrapper">
              <input type="color" class="form-control color-picker" v-model="currentTemplate.primary_color" />
              <input type="text" class="form-control color-text" v-model="currentTemplate.primary_color" placeholder="#4338ca" />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Logo de l'entreprise (Format PNG/JPG, idéalement petit et transparent) :</label>
          <div class="logo-upload-zone">
            <input type="file" accept="image/*" @change="onLogoChange" class="form-control" />
            <div v-if="currentTemplate.logo_base64" class="logo-preview-uploaded mt-2">
              <img :src="currentTemplate.logo_base64" alt="Prévisualisation du logo" />
              <button class="btn btn-danger btn-sm" @click="supprimerLogo">Supprimer le logo</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Mentions de bas de page (Coordonnées bancaires, mentions légales, etc.) :</label>
          <textarea rows="4" class="form-control" v-model="currentTemplate.footer_text" placeholder="Ex: SAS Hélios - Capital 10 000€ - Siret 123456789... Merci de régler par virement sous 30 jours."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showTemplateModal = false">Annuler</button>
        <button class="btn btn-primary" @click="procederEnregistrerTemplate" :disabled="!currentTemplate.nom">Enregistrer le Modèle</button>
      </div>
    </div>
  </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import {
  emailSettings,
  historiqueRelances,
  executerAutomatisationRelances,
  factures,
  templates,
  ajouterOuModifierTemplate,
  supprimerTemplate,
  utilisateurConnecte
} from '../utils/store.js';

export default {
  name: 'SettingsView',
  setup() {
    const formaterDate = (dateStr) => {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    };

    const formaterHeure = (dateStr) => {
      return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const configurerLocalhost = () => {
      emailSettings.value.smtpHost = 'localhost';
      emailSettings.value.smtpPort = 1025;
      emailSettings.value.smtpUser = 'test';
      emailSettings.value.smtpPass = '';
      emailSettings.value.senderEmail = 'compta@localhost.com';
      emailSettings.value.senderName = 'Service Comptable (Local)';
      alert("Configuration SMTP locale chargée.");
    };

    const lancerAutomatisation = async () => {
      const result = executerAutomatisationRelances();
      
      if (result.lancees > 0 && emailSettings.value.autoSendEnabled) {
        for (let i = 0; i < result.lancees; i++) {
          const log = historiqueRelances.value[i];
          const fac = factures.value.find(f => f.id_facture === log.facture_id) || { email_client: 'contact@client.com' };
          
          try {
            await fetch('http://localhost:3002/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                senderEmail: emailSettings.value.senderEmail,
                senderName: emailSettings.value.senderName,
                recipientEmail: fac.email_client,
                subject: log.sujet,
                body: log.corps
              })
            });
          } catch(e) {
            // Relais local injoignable, on ignore
          }
        }
      }

      alert(`Moteur d'automatisation exécuté :\n- ${result.lancees} relance(s) automatique(s) générée(s).\n\nDétails :\n${result.messages.join('\n')}`);
    };

    const viderHistorique = async () => {
      if (confirm("Voulez-vous vraiment vider l'historique des relances pour effectuer des tests ?")) {
        historiqueRelances.value = [];
        localStorage.setItem('rf_historique_relances', JSON.stringify([]));
        try {
          await fetch('http://localhost:3002/api/relances/clear', { method: 'POST' });
        } catch (e) {
          // Ignorer si le backend n'a pas cette route ou n'est pas joignable
        }
      }
    };

    // --- Gestion des Modèles ---
    const showTemplateModal = ref(false);
    const isEditMode = ref(false);
    const currentTemplate = ref({
      id: '',
      nom: '',
      primary_color: '#4338ca',
      layout_type: 'colored_header',
      footer_text: '',
      logo_base64: ''
    });

    const formaterLayoutType = (type) => {
      switch (type) {
        case 'colored_header': return 'En-tête coloré';
        case 'minimalist': return 'Minimaliste épuré';
        case 'bold_accent': return 'Ligne d\'accentuation';
        default: return type;
      }
    };

    const ouvrirCreerTemplate = () => {
      currentTemplate.value = {
        id: '',
        nom: '',
        primary_color: '#4338ca',
        layout_type: 'colored_header',
        footer_text: '',
        logo_base64: ''
      };
      isEditMode.value = false;
      showTemplateModal.value = true;
    };

    const ouvrirModifierTemplate = (tpl) => {
      currentTemplate.value = { ...tpl };
      isEditMode.value = true;
      showTemplateModal.value = true;
    };

    const procederEnregistrerTemplate = async () => {
      if (!currentTemplate.value.nom) return;
      
      if (!isEditMode.value) {
        currentTemplate.value.id = `t-${Date.now()}`;
      }
      
      await ajouterOuModifierTemplate(currentTemplate.value);
      showTemplateModal.value = false;
    };

    const supprimerTemplateClick = async (id) => {
      if (confirm('Voulez-vous vraiment supprimer ce modèle ?')) {
        await supprimerTemplate(id);
      }
    };

    const onLogoChange = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        currentTemplate.value.logo_base64 = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    const supprimerLogo = () => {
      currentTemplate.value.logo_base64 = '';
    };

    // --- Administration Alpha ---
    const alphaRequests = ref([]);

    const isAdmin = computed(() => {
      return utilisateurConnecte.value && 
             utilisateurConnecte.value.company_id === 'company-demo' && 
             utilisateurConnecte.value.role === 'admin';
    });

    const chargerAlphaRequests = async () => {
      if (!isAdmin.value) return;
      try {
        const response = await fetch('http://localhost:3002/api/admin/alpha/requests');
        if (response.ok) {
          alphaRequests.value = await response.json();
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des demandes d'accès Alpha :", err);
      }
    };

    const validerDemande = async (id) => {
      try {
        const response = await fetch('http://localhost:3002/api/admin/alpha/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        if (response.ok) {
          const res = await response.json();
          alert(`Accès Alpha validé !\nInvitation générée : ${res.invitationLink}`);
          await chargerAlphaRequests();
        } else {
          const err = await response.json();
          alert(`Erreur : ${err.message}`);
        }
      } catch (err) {
        alert("Impossible de joindre le serveur d'administration.");
      }
    };

    const rejeterDemande = async (id) => {
      if (confirm("Voulez-vous vraiment rejeter cette demande d'accès ?")) {
        try {
          const response = await fetch('http://localhost:3002/api/admin/alpha/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          });
          if (response.ok) {
            await chargerAlphaRequests();
          }
        } catch (err) {
          alert("Impossible de joindre le serveur d'administration.");
        }
      }
    };

    const formaterStatutAlpha = (statut) => {
      switch (statut) {
        case 'en_attente': return 'En attente';
        case 'valide': return 'Validé (Invité)';
        case 'active': return 'Actif (Inscrit)';
        case 'rejete': return 'Rejeté';
        default: return statut;
      }
    };

    const copierLienOnboarding = (token) => {
      const link = `${window.location.origin}/auth/welcome?token=${token}`;
      navigator.clipboard.writeText(link);
      alert("Lien d'invitation copié dans le presse-papiers !");
    };

    onMounted(() => {
      if (isAdmin.value) {
        chargerAlphaRequests();
      }
    });

    return {
      emailSettings,
      historiqueRelances,
      configurerLocalhost,
      lancerAutomatisation,
      viderHistorique,
      formaterDate,
      formaterHeure,
      templates,
      showTemplateModal,
      isEditMode,
      currentTemplate,
      formaterLayoutType,
      ouvrirCreerTemplate,
      ouvrirModifierTemplate,
      procederEnregistrerTemplate,
      supprimerTemplateClick,
      onLogoChange,
      supprimerLogo,
      isAdmin,
      alphaRequests,
      chargerAlphaRequests,
      validerDemande,
      rejeterDemande,
      formaterStatutAlpha,
      copierLienOnboarding
    };
  }
};
</script>

<style scoped>
.settings-container {
  padding: 2.5rem;
  background-color: var(--bg-dark);
  color: var(--text-main);
  min-height: 100vh;
}

.settings-header {
  margin-bottom: 2rem;
}

.settings-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-top: 0.2rem;
}

/* Dashboard Analytics Grid reuse */
.dashboard-analytics-grid {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.flex-1 { flex: 1; min-width: 300px; }
.flex-2 { flex: 2; min-width: 450px; }
.flex-col { display: flex; flex-direction: column; }

/* Panel Styles from Dashboard */
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-glass);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  padding: 1.5rem;
}

.panel-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.panel-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-subtitle {
  font-size: 1rem;
  font-weight: 600;
}

/* Forms and Inputs */
.form-group {
  margin-bottom: 1rem;
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
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1);
}
.form-row {
  display: flex;
  gap: 1rem;
}
.w-full {
  width: 100%;
}
.justify-center {
  justify-content: center;
}
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }

/* Toggles */
.toggle-group {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(15, 23, 42, 0.02);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-glass);
}
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
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
  background-color: #ccc;
  transition: .4s;
}
.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
}
input:checked + .slider {
  background-color: var(--success-color);
}
input:checked + .slider:before {
  transform: translateX(24px);
}
.slider.round {
  border-radius: 26px;
}
.slider.round:before {
  border-radius: 50%;
}
.toggle-text {
  display: flex;
  flex-direction: column;
}
.field-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: none;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary {
  background: var(--primary-color);
  color: white;
}
.btn-primary:hover {
  background: var(--primary-hover, #3730A3);
}
.btn-danger {
  background: var(--danger-color, #ef4444);
  color: white;
}
.btn-danger:hover {
  background: #dc2626;
}
.btn-secondary {
  background: white;
  border: 1px solid var(--border-glass);
  color: var(--text-main);
}
.btn-secondary:hover {
  background: rgba(15, 23, 42, 0.03);
}
.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

/* Logs */
.sent-reminders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
}
.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  background: rgba(15, 23, 42, 0.02);
  border-radius: 8px;
  border: 1px dashed var(--border-glass);
}
.reminder-log-card {
  padding: 1rem;
  border: 1px solid var(--border-glass);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.01);
}
.log-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}
.log-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}
.log-badge.auto { background: rgba(59, 130, 246, 0.15); color: #2563eb; }
.log-badge.manuel { background: rgba(100, 116, 139, 0.15); color: #475569; }
.log-type {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}
.log-type.cordial { background: rgba(16, 185, 129, 0.15); color: #059669; }
.log-type.ferme { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.log-type.mise_en_demeure { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
.log-date {
  margin-left: auto;
  color: var(--text-muted);
}
.log-body {
  font-size: 0.9rem;
}
.log-subject {
  color: var(--text-muted);
}
.log-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--success-color);
  margin-top: 0.5rem;
}
.status-dot.success {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success-color);
}

/* Modèles de facture styles */
.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
.template-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}
.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px -2px rgba(0, 0, 0, 0.1);
}
.template-card-header {
  border-top: 4px solid var(--primary-color);
  padding-top: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.template-layout-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  background: rgba(15, 23, 42, 0.05);
  border-radius: 6px;
  color: var(--text-muted);
}
.template-color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--border-glass);
}
.template-name {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.template-footer-preview {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}
.template-logo-preview-container {
  height: 40px;
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}
.template-logo-preview {
  max-height: 100%;
  max-width: 100px;
  object-fit: contain;
}
.template-no-logo {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
  margin-bottom: 1rem;
}
.template-card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  border-top: 1px solid var(--border-glass);
  padding-top: 0.75rem;
}

/* Modals re-styling/integration inside SettingsView */
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
  background: var(--bg-panel);
  border: 1px solid var(--border-glass);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
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
  max-height: 70vh;
  overflow-y: auto;
}
.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-glass);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Color picker specific styling */
.color-input-wrapper {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.color-picker {
  width: 45px;
  padding: 0.1rem;
  height: 38px;
  cursor: pointer;
}
.color-text {
  flex: 1;
}

.logo-preview-uploaded {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.logo-preview-uploaded img {
  max-height: 50px;
  max-width: 120px;
  object-fit: contain;
  border: 1px solid var(--border-glass);
  border-radius: 6px;
  padding: 4px;
  background: white;
}

/* Table Responsive & Administration Styles */
.table-responsive {
  width: 100%;
  overflow-x: auto;
}
.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.admin-table th, .admin-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border-glass);
  font-size: 0.9rem;
}
.admin-table th {
  font-weight: 600;
  color: var(--text-muted);
  background: rgba(15, 23, 42, 0.01);
}
.admin-row:hover {
  background: rgba(15, 23, 42, 0.01);
}
.badge-volume {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  background: rgba(99, 102, 241, 0.08);
  color: #4338ca;
  border-radius: 6px;
  font-weight: 500;
}
.status-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}
.status-badge.en_attente {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}
.status-badge.valide {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}
.status-badge.active {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}
.status-badge.rejete {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}
.btn-group {
  display: flex;
  gap: 0.5rem;
}
.actions-cell {
  white-space: nowrap;
}
.italic {
  font-style: italic;
}
.text-sm {
  font-size: 0.8rem;
}
.py-4 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}
</style>
