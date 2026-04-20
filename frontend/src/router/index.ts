import { createRouter, createWebHistory } from '@ionic/vue-router'
import { RouteRecordRaw } from 'vue-router'
import { session } from '@/data/session'

const routes: Array<RouteRecordRaw> = [
  // Root: redirect into tabs
  { path: '/', redirect: '/tabs/home' },

  // Public pages — no auth required
  {
    path: '/signature',
    name: 'Signature',
    component: () => import('@/views/SignaturePage.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage.vue'),
  },

  // Legacy redirects — keep old deep-links working
  { path: '/home',      redirect: '/tabs/home' },
  { path: '/swo',       redirect: '/tabs/orders' },
  { path: '/swo/new',   redirect: '/tabs/orders' },   // create is now a modal, not a page
  {
    path: '/swo/:name',
    redirect: (to) => `/tabs/orders/${to.params.name}`,
  },

  // ---------------------------------------------------------------------------
  // Authenticated tab shell — all protected pages live here as children.
  // TabsPage renders ion-tabs + ion-tab-bar; the ion-router-outlet inside
  // it handles rendering each child route.
  // ---------------------------------------------------------------------------
  {
    path: '/tabs',
    component: () => import('@/views/TabsPage.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '',        redirect: 'home' },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/HomePage.vue'),
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/SWOPage.vue'),
      },
      {
        // Sub-page rendered inside the Orders tab stack
        path: 'orders/:name',
        name: 'SWODetail',
        component: () => import('@/views/SWODetailPage.vue'),
      },
      {
        path: 'assistance',
        name: 'Assistance',
        component: () => import('@/views/AssistancePage.vue'),
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/ProfilePage.vue'),
      },
    ],
  },
]

// In production the app is served at /southwest by Frappe's www.
const base = import.meta.env.PROD ? '/southwest/' : '/'

const router = createRouter({
  history: createWebHistory(base),
  routes,
})

// ---------------------------------------------------------------------------
// Navigation guard — cookie-based, no API roundtrip.
// Frappe sets a user_id cookie; session.sessionUser() reads it synchronously.
// ---------------------------------------------------------------------------
router.beforeEach((to) => {
  const isGuest = !session.isLoggedIn

  // Guard applies to the /tabs parent — all children inherit it.
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)

  if (isGuest && requiresAuth) {
    return { name: 'Login' }
  }
  if (!isGuest && to.name === 'Login') {
    return { name: 'Home' }
  }
})

export default router
