<template>
  <div class="login-page">
    <!-- Fond animé et lueurs de gradient -->
    <div class="glowing-orb orb-1"></div>
    <div class="glowing-orb orb-2"></div>

    <div class="login-container">
      <div class="logo">
        <span class="logo-icon"><i class="fi fi-bs-shield-check"></i></span>
        <span class="logo-text">RelanceFacture</span>
      </div>

      <div class="login-card animate-zoom">
        <h2>Connexion Espace Membre</h2>
        <p class="subtitle">Saisissez vos identifiants pour accéder à votre console de relances</p>

        <form @submit.prevent="handleLogin" class="login-form">
          <div v-if="errorMessage" class="error-banner">
            {{ errorMessage }}
          </div>

          <div class="form-group">
            <label for="email">Adresse email</label>
            <div class="input-wrapper">
              <span class="input-icon"><i class="fi fi-bs-user"></i></span>
              <input 
                type="email" 
                id="email" 
                v-model="email" 
                required 
                placeholder="nom@entreprise.com"
                class="form-control"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="password">Mot de passe</label>
            <div class="input-wrapper">
              <span class="input-icon"><i class="fi fi-bs-settings"></i></span>
              <input 
                type="password" 
                id="password" 
                v-model="password" 
                required 
                placeholder="••••••••••••"
                class="form-control"
              />
            </div>
          </div>

          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="loading">Vérification en cours...</span>
            <span v-else>Se connecter <i class="fi fi-bs-arrow-right"></i></span>
          </button>
        </form>

        <div class="card-footer">
          <p>Pas encore d'accès ? <router-link to="/">Demander une démo</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { connexionUser } from '../utils/store.js';

export default {
  name: 'LoginView',
  setup() {
    const router = useRouter();
    const email = ref('');
    const password = ref('');
    const loading = ref(false);
    const errorMessage = ref('');

    const handleLogin = async () => {
      loading.value = true;
      errorMessage.value = '';
      try {
        await connexionUser(email.value, password.value);
        router.push('/dashboard');
      } catch (err) {
        errorMessage.value = err.message || "Identifiants ou mot de passe incorrects.";
      } finally {
        loading.value = false;
      }
    };

    return {
      email,
      password,
      loading,
      errorMessage,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login-page {
  --bg-login: #0b0f19;
  --panel-login: rgba(17, 24, 39, 0.75);
  --border-login: rgba(255, 255, 255, 0.08);
  --text-login-main: #f3f4f6;
  --text-login-muted: #9ca3af;
  --primary-glow: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);

  background-color: var(--bg-login);
  color: var(--text-login-main);
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

.login-container {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 440px;
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

.login-card {
  width: 100%;
  background: var(--panel-login);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-login);
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
}

.login-card h2 {
  font-size: 1.4rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}
.subtitle {
  font-size: 0.85rem;
  color: var(--text-login-muted);
  text-align: center;
  margin-bottom: 2rem;
  line-height: 1.4;
}

.form-group {
  margin-bottom: 1.25rem;
}
.form-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: var(--text-login-main);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon {
  position: absolute;
  left: 0.8rem;
  color: var(--text-login-muted);
  font-size: 0.95rem;
  pointer-events: none;
  display: flex;
  align-items: center;
}
.form-control {
  width: 100%;
  padding: 0.65rem 0.8rem 0.65rem 2.2rem;
  background: #1f2937;
  border: 1px solid var(--border-login);
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

.card-footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-login-muted);
}
.card-footer a {
  color: #818cf8;
  text-decoration: none;
  font-weight: 600;
}
.card-footer a:hover {
  text-decoration: underline;
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
