import { createRouter, createWebHistory } from '@ionic/vue-router'
import { RouteRecordRaw } from 'vue-router'
import { session } from '@/data/session'

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/login' },
  {
    // Public signature page — no auth required. Token in query param (?token=...).
    path: '/signature',
    name: 'Signature',
    component: () => import('@/views/SignaturePage.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage.vue'),
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/HomePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/swo',
    name: 'SWO',
    component: () => import('@/views/SWOPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/swo/new',
    name: 'CreateSWO',
    component: () => import('@/views/CreateSWOPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/swo/:name',
    name: 'SWODetail',
    component: () => import('@/views/SWODetailPage.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ---------------------------------------------------------------------------
// Navigation guard — cookie-based, no API roundtrip.
// Frappe sets a user_id cookie; session.sessionUser() reads it synchronously.
// ---------------------------------------------------------------------------
router.beforeEach((to) => {
  const isGuest = !session.isLoggedIn

  if (isGuest && to.meta.requiresAuth) {
    return { name: 'Login' }
  }
  if (!isGuest && to.name === 'Login') {
    return { name: 'Home' }
  }
})

export default router
