import { reactive } from 'vue'

type Win = { csrf_token?: string }
const w = window as unknown as Win

function frappeHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Frappe-Site-Name': window.location.hostname,
  }
  // '{{ csrf_token }}' is the un-rendered Jinja placeholder — skip it
  if (w.csrf_token && w.csrf_token !== '{{ csrf_token }}') {
    h['X-Frappe-CSRF-Token'] = w.csrf_token
  }
  return h
}

async function frappePost(method: string, args: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch(`/api/method/${method}`, {
    method: 'POST',
    headers: frappeHeaders(),
    credentials: 'include',          // always send/receive cookies
    body: JSON.stringify(args),
  })
  const data = await res.json()
  if (!res.ok) {
    const msgs: string[] = []
    if (data?._server_messages) {
      try {
        const parsed = JSON.parse(data._server_messages)
        for (const m of parsed) {
          try { msgs.push(JSON.parse(m).message) } catch { msgs.push(m) }
        }
      } catch { /* ignore */ }
    }
    if (data?._error_message) msgs.push(data._error_message)
    const err: any = new Error(msgs[0] || data?.message || 'Request failed')
    err.status = res.status
    err.messages = msgs
    throw err
  }
  return data
}

export function sessionUser(): string | null {
  const cookies = new URLSearchParams(document.cookie.split('; ').join('&'))
  const user = cookies.get('user_id')
  return user === 'Guest' || !user ? null : user
}

export const session = reactive({
  user: sessionUser(),
  get isLoggedIn() { return !!this.user },

  async login(email: string, password: string): Promise<any> {
    const data = await frappePost('login', { usr: email, pwd: password })
    handleLogin(data)
    return data
  },

  async otp(tmp_id: string, otp: string): Promise<any> {
    const data = await frappePost('login', { tmp_id, otp })
    handleLogin(data)
    return data
  },

  logout: async (): Promise<void> => {
    try { await frappePost('logout') } catch { /* ignore */ }
    window.location.href = '/southwest'
  },
})

function handleLogin(data: any) {
  // Frappe returns {"message": "Logged In"} on success.
  // Also verify via cookie in case the message differs across versions.
  if (data?.message === 'Logged In' || !!sessionUser()) {
    // Full page reload so Frappe injects a fresh CSRF token for the new session.
    window.location.href = '/southwest/swo'
  }
}
