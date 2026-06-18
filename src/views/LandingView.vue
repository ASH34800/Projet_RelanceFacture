<template>
  <div class="landing-page">
    <!-- Fond animé et lueurs de gradient -->
    <div class="glowing-orb orb-1"></div>
    <div class="glowing-orb orb-2"></div>

    <!-- En-tête / Barre de navigation épurée -->
    <header class="landing-header">
      <div class="logo">
        <span class="logo-icon"><i class="fi fi-bs-shield-check"></i></span>
        <span class="logo-text">RelanceFacture <span class="alpha-tag">Alpha</span></span>
      </div>
      <router-link to="/login" class="btn-login-nav">Connexion</router-link>
    </header>

    <!-- Section Hero -->
    <section class="hero-section">
      <div class="hero-content">
        <span class="badge-new">✨ Version Alpha Privée</span>
        <h1>Sécurisez votre trésorerie avec des relances intelligentes</h1>
        <p class="hero-subtitle">
          Automatisez le suivi de vos encours clients, préisez les retards grâce au scoring de paiement prédictif, et facilitez vos encaissements au sein d'une plateforme multi-tenant souveraine.
        </p>
        <div class="hero-actions">
          <button @click="openModal" class="btn-cta">
            Demander un accès Alpha <i class="fi fi-bs-arrow-right"></i>
          </button>
        </div>
      </div>
    </section>

    <!-- Grille des fonctionnalités clés -->
    <section class="features-section">
      <div class="section-title">
        <h2>Une suite d'outils pensée pour la trésorerie B2B</h2>
        <p>Toutes les fonctionnalités nécessaires pour maîtriser le poste clients</p>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon bg-indigo"><i class="fi fi-bs-chart-pie-alt"></i></div>
          <h3>Scoring Prédictif de Retard</h3>
          <p>Analysez l'historique de paiement de vos clients pour anticiper les comportements de paiement et adapter la fermeté de vos relances.</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon bg-violet"><i class="fi fi-bs-settings"></i></div>
          <h3>Relances Automatisées SMTP</h3>
          <p>Configurez vos propres serveurs SMTP d'expédition pour envoyer vos e-mails de relance avec votre propre nom de domaine en toute transparence.</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon bg-emerald"><i class="fi fi-bs-document"></i></div>
          <h3>Génération de PDF & Factures</h3>
          <p>Créez des modèles de factures personnalisés à l'image de votre marque et visualisez le rendu PDF généré directement sur le portail.</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon bg-amber"><i class="fi fi-bs-shield-check"></i></div>
          <h3>Isolation Multi-Tenant</h3>
          <p>Chaque entreprise dispose d'une base de données logique isolée. Vos données de facturation sont sécurisées et strictement étanches.</p>
        </div>
      </div>
    </section>

    <!-- Section de réassurance -->
    <section class="reassurance-section">
      <div class="reassurance-grid">
        <div class="metric-item">
          <span class="metric-val">-14 jours</span>
          <span class="metric-label">Délai Moyen de Paiement (DSO)</span>
        </div>
        <div class="metric-item">
          <span class="metric-val">100%</span>
          <span class="metric-label">Données isolées et hébergées en France</span>
        </div>
        <div class="metric-item">
          <span class="metric-val">10 min</span>
          <span class="metric-label">Temps de configuration initial</span>
        </div>
      </div>
    </section>

    <!-- Pied de page -->
    <footer class="landing-footer">
      <p>&copy; 2026 RelanceFacture. Tous droits réservés.</p>
      <div class="footer-links">
        <router-link to="/login" class="hidden-admin-link">Accès Administrateur</router-link>
      </div>
    </footer>

    <!-- Modal Formulaire Alpha -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box animate-zoom">
        <div class="modal-header">
          <h3>Rejoindre l'Alpha Privée</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        
        <div class="modal-body">
          <div v-if="successSubmitted" class="success-state">
            <div class="success-icon"><i class="fi fi-bs-shield-check"></i></div>
            <h4>Demande enregistrée avec succès !</h4>
            <p>
              Merci pour votre intérêt. Notre équipe valide manuellement chaque compte de l'Alpha privée. 
              Vous recevrez un e-mail contenant votre invitation unique dès sa validation par notre administrateur.
            </p>
            <button @click="closeModal" class="btn btn-primary mt-4">Fermer la fenêtre</button>
          </div>

          <form v-else @submit.prevent="submitRequest" class="alpha-form">
            <p class="form-desc">
              Remplissez ce formulaire. Notre équipe examinera votre demande et vous transmettra un token d'activation par e-mail.
            </p>

            <div v-if="errorMessage" class="error-banner">
              {{ errorMessage }}
            </div>

            <div class="form-group">
              <label for="nom_complet">Nom complet</label>
              <input 
                type="text" 
                id="nom_complet" 
                v-model="form.nom_complet" 
                required 
                placeholder="Ex: Camille Dupont"
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label for="nom_entreprise">Nom de l'entreprise</label>
              <input 
                type="text" 
                id="nom_entreprise" 
                v-model="form.nom_entreprise" 
                required 
                placeholder="Ex: ACME Services"
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label for="volume_factures">Volume de factures par mois</label>
              <select 
                id="volume_factures" 
                v-model="form.volume_factures" 
                required
                class="form-select"
              >
                <option value="" disabled selected>Sélectionnez votre volume mensuel</option>
                <option value="< 100 factures/mois">&lt; 100 factures par mois</option>
                <option value="100-500 factures/mois">100 à 500 factures par mois</option>
                <option value="> 500 factures/mois">&gt; 500 factures par mois</option>
              </select>
            </div>

            <div class="form-group">
              <label for="email">Adresse email professionnelle</label>
              <input 
                type="email" 
                id="email" 
                v-model="form.email" 
                required 
                placeholder="Ex: camille.dupont@entreprise.com"
                class="form-control"
              />
            </div>

            <button type="submit" class="btn btn-submit" :disabled="submitting">
              <span v-if="submitting">Envoi en cours...</span>
              <span v-else>Soumettre ma demande d'accès <i class="fi fi-bs-arrow-right"></i></span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';

export default {
  name: 'LandingView',
  setup() {
    const showModal = ref(false);
    const successSubmitted = ref(false);
    const submitting = ref(false);
    const errorMessage = ref('');

    const form = reactive({
      nom_complet: '',
      nom_entreprise: '',
      volume_factures: '',
      email: ''
    });

    const openModal = () => {
      showModal.value = true;
      successSubmitted.value = false;
      errorMessage.value = '';
      form.nom_complet = '';
      form.nom_entreprise = '';
      form.volume_factures = '';
      form.email = '';
    };

    const closeModal = () => {
      showModal.value = false;
    };

    const submitRequest = async () => {
      submitting.value = true;
      errorMessage.value = '';
      try {
        const response = await fetch('http://localhost:3002/api/alpha/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });

        if (response.ok) {
          successSubmitted.value = true;
        } else {
          const errData = await response.json();
          errorMessage.value = errData.message || "Une erreur est survenue lors de la soumission.";
        }
      } catch (err) {
        errorMessage.value = "Impossible de joindre le serveur de validation.";
      } finally {
        submitting.value = false;
      }
    };

    return {
      showModal,
      successSubmitted,
      submitting,
      errorMessage,
      form,
      openModal,
      closeModal,
      submitRequest
    };
  }
};
</script>

<style scoped>
/* Reset local et variables dark premium */
.landing-page {
  --bg-landing: #0b0f19;
  --panel-landing: rgba(17, 24, 39, 0.7);
  --border-landing: rgba(255, 255, 255, 0.08);
  --text-landing-main: #f3f4f6;
  --text-landing-muted: #9ca3af;
  --primary-glow: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  
  background-color: var(--bg-landing);
  color: var(--text-landing-main);
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  font-family: 'Outfit', 'Inter', sans-serif;
  padding: 0 2rem;
  display: flex;
  flex-direction: column;
}

/* Orbes de gradients lumineux en arrière-plan */
.glowing-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(140px);
  z-index: 1;
  pointer-events: none;
  opacity: 0.4;
}
.orb-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -100px;
  background: #6366f1;
}
.orb-2 {
  width: 500px;
  height: 500px;
  bottom: -150px;
  left: -150px;
  background: #a855f7;
}

/* Header */
.landing-header {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--border-landing);
}
.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.logo-icon {
  font-size: 1.5rem;
  background: var(--primary-glow);
  padding: 0.35rem;
  border-radius: 8px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-text {
  font-weight: 700;
  font-size: 1.3rem;
  letter-spacing: -0.01em;
}
.alpha-tag {
  font-size: 0.7rem;
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  font-weight: 600;
  margin-left: 0.25rem;
  vertical-align: middle;
}
.btn-login-nav {
  text-decoration: none;
  color: var(--text-landing-main);
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  border: 1px solid var(--border-landing);
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.2s ease;
}
.btn-login-nav:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

/* Hero Section */
.hero-section {
  position: relative;
  z-index: 10;
  padding: 6rem 0 4rem;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}
.badge-new {
  display: inline-block;
  padding: 0.35rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-landing);
  margin-bottom: 1.5rem;
  color: #c084fc;
}
.hero-section h1 {
  font-size: 3.25rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #ffffff 60%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero-subtitle {
  font-size: 1.15rem;
  line-height: 1.6;
  color: var(--text-landing-muted);
  margin-bottom: 2.5rem;
}
.btn-cta {
  background: var(--primary-glow);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}
.btn-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.6);
}

/* Features Grid */
.features-section {
  position: relative;
  z-index: 10;
  padding: 4rem 0;
  max-width: 1100px;
  margin: 0 auto;
}
.section-title {
  text-align: center;
  margin-bottom: 3.5rem;
}
.section-title h2 {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.section-title p {
  color: var(--text-landing-muted);
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 2rem;
}
.feature-card {
  background: var(--panel-landing);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-landing);
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.2s ease;
}
.feature-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(17, 24, 39, 0.85);
}
.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  margin-bottom: 1.25rem;
  color: white;
}
.bg-indigo { background: #4f46e5; }
.bg-violet { background: #7c3aed; }
.bg-emerald { background: #059669; }
.bg-amber { background: #d97706; }

.feature-card h3 {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}
.feature-card p {
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-landing-muted);
}

/* Reassurance Section */
.reassurance-section {
  position: relative;
  z-index: 10;
  padding: 4rem 0;
  border-top: 1px solid var(--border-landing);
  border-bottom: 1px solid var(--border-landing);
  margin-top: 2rem;
}
.reassurance-grid {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}
.metric-item {
  display: flex;
  flex-direction: column;
}
.metric-val {
  font-size: 2.25rem;
  font-weight: 800;
  background: var(--primary-glow);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.metric-label {
  font-size: 0.9rem;
  color: var(--text-landing-muted);
  margin-top: 0.5rem;
  font-weight: 500;
}

/* Footer */
.landing-footer {
  position: relative;
  z-index: 10;
  padding: 3rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  font-size: 0.85rem;
  color: #6b7280;
}
.hidden-admin-link {
  text-decoration: none;
  color: #4b5563;
  transition: color 0.2s ease;
  font-weight: 500;
}
.hidden-admin-link:hover {
  color: var(--text-landing-muted);
}

/* Modal form style */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(3, 7, 18, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1.5rem;
}
.modal-box {
  width: 100%;
  max-width: 500px;
  background: #111827;
  border: 1px solid var(--border-landing);
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}
.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-landing);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}
.close-btn {
  background: none;
  border: none;
  color: var(--text-landing-muted);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}
.close-btn:hover {
  color: white;
}
.modal-body {
  padding: 1.5rem;
}

/* Form inputs & styling */
.form-desc {
  font-size: 0.85rem;
  color: var(--text-landing-muted);
  margin-bottom: 1.25rem;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
  color: var(--text-landing-main);
}
.form-control, .form-select {
  width: 100%;
  padding: 0.65rem 0.8rem;
  background: #1f2937;
  border: 1px solid var(--border-landing);
  border-radius: 8px;
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.form-control:focus, .form-select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
}
.btn-submit {
  width: 100%;
  background: var(--primary-glow);
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  transition: all 0.2s;
}
.btn-submit:hover {
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Success layout */
.success-state {
  text-align: center;
  padding: 1rem 0;
}
.success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  font-size: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
}
.success-state h4 {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.success-state p {
  font-size: 0.85rem;
  color: var(--text-landing-muted);
  line-height: 1.5;
}

.error-banner {
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  color: #f87171;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

/* Animations */
.animate-zoom {
  animation: zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media(max-width: 640px) {
  .hero-section h1 {
    font-size: 2.25rem;
  }
  .landing-footer {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
}
</style>
