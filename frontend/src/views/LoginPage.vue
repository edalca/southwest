<template>
  <ion-page>
    <ion-content>
      <div class="login-wrap">

        <!-- Logo + title -->
        <div class="login-header">
          <div class="login-icon">
            <FeatherIcon name="tool" class="h-8 w-8 text-white" />
          </div>
          <h1 class="login-title">Southwest</h1>
          <p class="login-sub">{{ __("Sign in to your account") }}</p>
        </div>

        <!-- Form -->
        <form class="login-form" @submit.prevent="submit">
          <div class="field">
            <label class="field-label">{{ __("Username") }}</label>
            <input
              class="field-input"
              type="text"
              :placeholder="__('Enter your username')"
              v-model="email"
              autocomplete="username"
              inputmode="email"
            />
          </div>

          <div class="field">
            <label class="field-label">{{ __("Password") }}</label>
            <input
              class="field-input"
              type="password"
              placeholder="••••••••"
              v-model="password"
              autocomplete="current-password"
            />
          </div>

          <p v-if="errorMessage" class="login-error">{{ errorMessage }}</p>

          <button
            class="login-btn"
            type="submit"
            :disabled="loading"
            @click="submit"
          >
            <span v-if="loading" class="login-spinner" />
            <span v-else>{{ __("Sign In") }}</span>
          </button>
        </form>

      </div>

      <!-- Reset password dialog -->
      <Dialog v-model="resetPassword.showDialog">
        <template #body-title>
          <h2 class="text-lg font-bold">{{ __("Reset Password") }}</h2>
        </template>
        <template #body-content>
          <p>{{ __("Your password has expired. Please reset your password to continue") }}</p>
        </template>
        <template #actions>
          <a
            class="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none text-white bg-gray-900 hover:bg-gray-800 active:bg-gray-700 rounded px-4 py-2 text-sm font-medium"
            :href="resetPassword.link"
            target="_blank"
          >
            {{ __("Go to Reset Password page") }}
          </a>
        </template>
      </Dialog>

      <!-- OTP dialog -->
      <Dialog v-model="otp.showDialog">
        <template #body-title>
          <h2 class="text-lg font-bold">{{ __("OTP Verification") }}</h2>
        </template>
        <template #body-content>
          <p class="mb-4 text-sm text-gray-600" v-if="otp.verification.prompt">
            {{ otp.verification.prompt }}
          </p>
          <div class="field">
            <label class="field-label">{{ __("OTP Code") }}</label>
            <input
              class="field-input"
              type="text"
              placeholder="000000"
              v-model="otp.code"
              autocomplete="one-time-code"
              inputmode="numeric"
            />
          </div>
          <p v-if="errorMessage" class="login-error mt-2">{{ errorMessage }}</p>
          <button
            class="login-btn mt-4"
            type="button"
            :disabled="loading"
            @click="submit"
          >
            <span v-if="loading" class="login-spinner" />
            <span v-else>{{ __("Verify") }}</span>
          </button>
        </template>
      </Dialog>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent } from "@ionic/vue"
import { inject, reactive, ref } from "vue"
import { Dialog, FeatherIcon } from "frappe-ui"
import type { session as SessionType } from '@/data/session'

const email = ref<string>("")
const password = ref<string>("")
const errorMessage = ref<string>("")
const loading = ref<boolean>(false)

const resetPassword = reactive({
  showDialog: false,
  link: "",
})

const otp = reactive({
  showDialog: false,
  tmp_id: "",
  code: "",
  verification: {} as Record<string, any>,
})

const session = inject<typeof SessionType>('$session')!
const __ = inject<(t: string) => string>('$translate', (t) => t)

async function submit() {
  loading.value = true
  errorMessage.value = ""
  try {
    let response: any
    if (otp.showDialog) {
      response = await session.otp(otp.tmp_id, otp.code)
    } else {
      response = await session.login(email.value, password.value)
    }

    if (response?.message === "Password Reset") {
      resetPassword.showDialog = true
      resetPassword.link = response.redirect_to
    } else {
      resetPassword.showDialog = false
      resetPassword.link = ""
    }

    // OTP verification
    if (response?.verification) {
      if (response.verification.setup) {
        otp.showDialog = true
        otp.tmp_id = response.tmp_id
        otp.verification = response.verification
      } else {
        window.open("/login?redirect-to=" + encodeURIComponent(window.location.pathname), "_blank")
      }
    }
  } catch (error: any) {
    if (error?.messages?.length) {
      errorMessage.value = error.messages.join("\n")
    } else if (error?.status === 401 || error?.status === 403) {
      errorMessage.value = __("Incorrect username or password.")
    } else {
      errorMessage.value = error?.message || __("Login failed.")
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px 48px;
  background: #f5f5f7;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 36px;
}

.login-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #111;
  margin: 0;
}

.login-sub {
  font-size: 15px;
  color: #888;
  margin: 0;
}

.login-form {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.field-input {
  width: 100%;
  height: 52px;
  padding: 0 16px;
  font-size: 16px;
  border: 1.5px solid #ddd;
  border-radius: 12px;
  background: #fff;
  color: #111;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.field-input:focus {
  border-color: #111;
}

.field-input::placeholder {
  color: #bbb;
}

.login-error {
  font-size: 14px;
  color: #e53e3e;
  margin: 0;
}

.login-btn {
  height: 54px;
  width: 100%;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
  transition: background 0.15s;
}

.login-btn:active {
  background: #333;
}

.login-btn:disabled {
  background: #999;
  cursor: not-allowed;
}

.login-spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
