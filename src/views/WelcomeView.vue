<template>
  <div class="welcome-page">
    <!-- Fond animé et lueurs de gradient -->
    <div class="glowing-orb orb-1"></div>
    <div class="glowing-orb orb-2"></div>

    <div class="welcome-container">
      <div class="logo">
        <span class="logo-icon"><i class="fi fi-bs-shield-check"></i></span>
        <span class="logo-text">RelanceFacture</span>
      </div>

      <!-- Chargement initial -->
      <div v-if="verifying" class="welcome-card text-center animate-zoom">
        <div class="spinner"></div>
        <h3 class="mt-4">Vérification de votre invitation...</h3>
        <p class="subtitle">Nous validons la sécurité de votre jeton d'accès</p>
      </div>

      <!-- Erreur de token -->
      <div v-else-if="tokenError" class="welcome-card error-state text-center animate-zoom">
        <div class="error-icon"><i class="fi fi-bs-shield-check"></i></div>
        <h3>Lien d'invitation invalide ou expiré</h3>
        <p class="subtitle">
          Le lien de validation que vous avez suivi a déjà été utilisé ou sa durée de validité a expiré. 
          Veuillez contacter l'administrateur ou soumettre une nouvelle demande.
        </p>
        <router-link to="/" class="btn btn-primary mt-4">Retourner à l'accueil</router-link>
      </div>

      <!-- Formulaire d'onboarding actif -->
      <div v-else class="welcome-card animate-zoom">
        <span class="welcome-badge">🌱 Finalisation de votre espace</span>
        <h2>Bienvenue sur RelanceFacture !</h2>
        <p class="subtitle">
          Configurez votre mot de passe administrateur pour activer votre organisation.
        </p>

        <div class="company-preview">
          <div class="preview-item">
            <span class="label">Organisation :</span>
            <strong class="value">{{ companyName }}</strong>
          </div>
          <div class="preview-item">
            <span class="label">Administrateur :</span>
            <span class="value">{{ adminName }} ({{ adminEmail }})</span>
          </div>
        </div>

        <form @submit.prevent="submitOnboarding" class="onboarding-form">
          <div v-if="errorMessage" class="error-banner">
            {{ errorMessage }}
          </div>

          <div class="form-group">
            <label for="password">Définir un mot de passe</label>
            <div class="input-wrapper">
              <span class="input-icon"><i class="fi fi-bs-settings"></i></span>
              <input 
                type="password" 
                id="password" 
                v-model="password" 
                required 
                placeholder="Mot de passe robuste"
                class="form-control"
              />
            </div>
            <span class="field-hint">Minimum 6 caractères conseillé.</span>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirmer le mot de passe</label>
            <div class="input-wrapper">
              <span class="input-icon"><i class="fi fi-bs-settings"></i></span>
              <input 
                type="password" 
                id="confirmPassword" 
                v-model="confirmPassword" 
                required 
                placeholder="Répétez le mot de passe"
                class="form-control"
              />
            </div>
          </div>

          <button type="submit" class="btn-submit" :disabled="submitting">
            <span v-if="submitting">Configuration de votre espace...</span>
            <span v-else>Activer mon organisation <i class="fi fi-bs-arrow-right"></i></span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { finaliserOnboarding } from '../utils/store.js';

export default {
  name: 'WelcomeView',
  setup() {
    const route = useRoute();
    const router = useRouter();

    const verifying = ref(true);
    const tokenError = ref(false);
    const submitting = ref(false);
    const errorMessage = ref('');

    const token = ref('');
    const companyName = ref('');
    const adminName = ref('');
    const adminEmail = ref('');

    const password = ref('');
    const confirmPassword = ref('');

    const verifyToken = async (invitationToken) => {
      try {
        const response = await fetch(`http://localhost:3002/api/auth/verify-token?token=${invitationToken}`);
        if (response.ok) {
          const data = await response.json();
          companyName.value = data.nom_entreprise;
          adminName.value = data.nom_complet;
          adminEmail.value = data.email;
          token.value = invitationToken;
          verifying.value = false;
        } else {
          tokenError.value = true;
          verifying.value = false;
        }
      } catch (err) {
        tokenError.value = true;
        verifying.value = false;
      }
    };

    const submitOnboarding = async () => {
      if (password.value !== confirmPassword.value) {
        errorMessage.value = "Les mots de passe ne correspondent pas.";
        return;
      }
      if (password.value.length < 6) {
        errorMessage.value = "Le mot de passe doit comporter au moins 6 caractères.";
        return;
      }

      submitting.value = true;
      errorMessage.value = '';

      try {
        await finaliserOnboarding(token.value, password.value);
        router.push('/dashboard');
      } catch (err) {
        errorMessage.value = err.message || "Impossible de finaliser l'installation.";
      } finally {
        submitting.value = false;
      }
    };

    onMounted(() => {
      const t = route.query.token;
      if (!t) {
        tokenError.value = true;
        verifying.value = false;
      } else {
        verifyToken(t);
      }
    });

    return {
      verifying,
      tokenError,
      submitting,
      errorMessage,
      companyName,
      adminName,
      adminEmail,
      password,
      confirmPassword,
      submitOnboarding
    };
  }
};
</script>

<style scoped>
.welcome-page {
  --bg-welcome: #0b0f19;
  --panel-welcome: rgba(17, 24, 39, 0.75);
  --border-welcome: rgba(255, 255, 255, 0.08);
  --text-welcome-main: #f3f4f6;
  --text-welcome-muted: #9ca3af;
  --primary-glow: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  --success-color: #059669;
  --danger-color: #dc2626;

  background-color: var(--bg-welcome);
  color: var(--text-welcome-main);
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  font-family: 'Outfit', 'Inter', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

/* Orbes de gradients lumineux */
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
  width: 450px;
  height: 450px;
  bottom: -150px;
  left: -150px;
  background: #a855f7;
}

.welcome-container {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.logo-icon {
  font-size: 1.4rem;
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
  font-size: 1.25rem;
  letter-spacing: -0.01em;
}

.welcome-card {
  width: 100%;
  background: var(--panel-welcome);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-welcome);
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
}

.welcome-badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.2);
  margin-bottom: 1rem;
}

.welcome-card h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}
.subtitle {
  font-size: 0.85rem;
  color: var(--text-welcome-muted);
  margin-bottom: 1.5rem;
  line-height: 1.4;
}

.company-preview {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-welcome);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.preview-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}
.preview-item .label {
  color: var(--text-welcome-muted);
}
.preview-item .value {
  font-weight: 600;
  text-align: right;
}

.form-group {
  margin-bottom: 1.25rem;
}
.form-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: var(--text-welcome-main);
}
.field-hint {
  font-size: 0.75rem;
  color: var(--text-welcome-muted);
  margin-top: 0.25rem;
  display: block;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon {
  position: absolute;
  left: 0.8rem;
  color: var(--text-welcome-muted);
  font-size: 0.95rem;
  pointer-events: none;
  display: flex;
  align-items: center;
}
.form-control {
  width: 100%;
  padding: 0.65rem 0.8rem 0.65rem 2.2rem;
  background: #1f2937;
  border: 1px solid var(--border-welcome);
  border-radius: 8px;
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.form-control:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.error-banner {
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
  color: #f87171;
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
  text-align: center;
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
  margin-top: 1.5rem;
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

/* Spinner and state classes */
.text-center { text-align: center; }
.mt-4 { margin-top: 1rem; }
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: #6366f1;
  animation: spin 1s ease-in-out infinite;
  margin: 0 auto;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  border-color: rgba(239, 68, 68, 0.2);
}
.error-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
}
.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-primary {
  background: #4f46e5;
  color: white;
}
.btn-primary:hover {
  background: #4338ca;
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
</style>
