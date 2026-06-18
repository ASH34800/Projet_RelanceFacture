import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from './components/Dashboard.vue';
import InvoicesView from './views/InvoicesView.vue';
import ClientDetailView from './views/ClientDetailView.vue';
import SettingsView from './views/SettingsView.vue';
import LandingView from './views/LandingView.vue';
import LoginView from './views/LoginView.vue';
import WelcomeView from './views/WelcomeView.vue';
import { tokenSession } from './utils/store.js';

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingView
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/auth/welcome',
    name: 'Welcome',
    component: WelcomeView
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/factures',
    name: 'Invoices',
    component: InvoicesView
  },
  {
    path: '/clients/:id',
    name: 'ClientDetail',
    component: ClientDetailView,
    props: true
  },
  {
    path: '/parametres',
    name: 'Settings',
    component: SettingsView
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const isAuth = !!tokenSession.value;
  const isPublic = ['/', '/login', '/auth/welcome'].includes(to.path);

  if (isAuth) {
    if (isPublic) {
      next('/dashboard');
    } else {
      next();
    }
  } else {
    if (isPublic) {
      next();
    } else {
      next('/');
    }
  }
});

