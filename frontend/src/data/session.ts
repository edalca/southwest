import { computed, reactive } from 'vue'
import { call, createResource } from 'frappe-ui'
import router from '@/router'

type FrappeWindow = { csrf_token?: string }
const w = window as unknown as FrappeWindow

export function sessionUser(): string | null {
  const cookies = new URLSearchParams(document.cookie.split('; ').join('&'))
  const user = cookies.get('user_id')
  return user === 'Guest' || !user ? null : user
}

export const session = reactive({
  user: sessionUser(),
  get isLoggedIn() { return !!this.user },

  async login(email: string, password: string): Promise<any> {
    const response = await call('login', { usr: email, pwd: password })
    handleLogin(response)
    return response
  },

  async otp(tmp_id: string, otp: string): Promise<any> {
    const response = await call('login', { tmp_id, otp })
    handleLogin(response)
    return response
  },

  logout: async (): Promise<void> => {
    try { await call('logout') } catch { /* ignore */ }
    session.user = sessionUser()
    router.replace({ name: 'Login' })
    window.location.reload()
  },
})

function handleLogin(response: any) {
  if (response.message === 'Logged In') {
    session.user = sessionUser()
    router.replace({ path: '/swo' })
  }
}
