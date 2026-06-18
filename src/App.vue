<template>
  <div class="app-layout">
    <!-- Barre Latérale de Navigation -->
    <aside v-if="utilisateurConnecte" class="sidebar">
      <div class="sidebar-header">
        <span class="logo-emoji"><i class="fi fi-bs-shield-check"></i></span>
        <div class="brand-info">
          <h2>RelanceFacture</h2>
          <span class="badge-mvp">MVP v1.0</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="nav-item" active-class="active">
          <span class="icon"><i class="fi fi-bs-chart-pie-alt"></i></span>
          <span class="label">Vue d'ensemble</span>
        </router-link>
        <router-link to="/factures" class="nav-item" active-class="active">
          <span class="icon"><i class="fi fi-bs-document"></i></span>
          <span class="label">Factures & Encours</span>
        </router-link>
        <router-link to="/parametres" class="nav-item" active-class="active">
          <span class="icon"><i class="fi fi-bs-settings"></i></span>
          <span class="label">Paramètres & Historique</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-profile">
          <div class="avatar"><i class="fi fi-bs-user"></i></div>
          <div class="profile-details">
            <span class="name">{{ utilisateurConnecte.nom }}</span>
            <span class="role">{{ companyActive?.nom || 'Sans entreprise' }}</span>
          </div>
          <button class="btn-logout" @click="logout" title="Se déconnecter">
            <i class="fi fi-bs-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </aside>

    <!-- Contenu Principal -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script>
import { useRouter } from 'vue-router';
import { utilisateurConnecte, companyActive, deconnexionUser } from './utils/store.js';

export default {
  name: 'App',
  setup() {
    const router = useRouter();

    const logout = () => {
      deconnexionUser();
      router.push('/');
    };

    return {
      utilisateurConnecte,
      companyActive,
      logout
    };
  }
};
</script>

<style>
/* Styles Globaux de l'Application */
:root {
  --bg-dark: #F3F4F6;
  --bg-panel: #FFFFFF;
  --border-glass: #E5E7EB;
  --text-main: #111827;
  --text-muted: #6B7280;
  --primary-color: #4338CA;
  --primary-gradient: #4338CA;
  --success-color: #059669;
  --warning-color: #D97706;
  --danger-color: #DC2626;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--bg-dark);
  color: var(--text-main);
  font-family: 'Outfit', 'Inter', sans-serif;
  overflow-x: hidden;
}

/* Scrollbar Styles */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: rgba(241, 245, 249, 0.5);
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.15);
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

/* Neumorphism/Clean B2B Cards */
.glass {
  background: var(--bg-panel);
  border: 1px solid var(--border-glass);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border-radius: 12px;
}

.sidebar {
  width: 280px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  z-index: 10;
  background: #1e1b4b; /* Bleu marin */
  color: #ffffff;
  border-right: none;
}

.sidebar-header {
  padding: 2rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-emoji {
  font-size: 2rem;
  background: var(--primary-gradient);
  padding: 0.4rem;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
}

.brand-info h2 {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #ffffff;
}

.badge-mvp {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  display: inline-block;
  margin-top: 0.1rem;
}

.sidebar-nav {
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.85rem 1rem;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transform: translateX(3px);
}

.nav-item.active {
  background: var(--primary-gradient);
  color: #ffffff;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.25);
}

.sidebar-footer {
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
}

.btn-logout {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 1.15rem;
  padding: 0.45rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-left: auto;
}

.btn-logout:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.profile-details {
  display: flex;
  flex-direction: column;
}

.profile-details .name {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  color: #ffffff;
}

.profile-details .role {
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

/* Main Content Area */
.main-content {
  flex: 1;
  background-color: var(--bg-dark);
  min-height: 100vh;
  overflow-y: auto;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Status Indicators */
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.success { background-color: var(--success-color); }
.status-dot.danger { background-color: var(--danger-color); }
.status-dot.warning { background-color: var(--warning-color); }
.status-dot.pending { background-color: var(--warning-color); }

.success-text { color: var(--success-color); }
.danger-text { color: var(--danger-color); }
.warning-text { color: var(--warning-color); }
.text-muted { color: var(--text-muted); }
</style>
