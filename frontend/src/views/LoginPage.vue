<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="custom-toolbar">
        <ion-title class="ion-text-center">
          <span class="toolbar-brand">{{ __("Southwest Login") }}</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="login-page-content">
      <div class="login-container">
        <!-- Decoration / Background blobs -->
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>

        <div class="login-wrapper">
          <div class="flex-spacer"></div>
          <div class="login-inner border-glass">
            <!-- Logo Section -->
            <div class="logo-section">
              <img src="/logo.png" alt="Southwest Logo" class="brand-logo" />
              <div class="brand-info">
                <h1 class="brand-name">Southwest</h1>
                <p class="brand-tagline">{{ __("Repair & Service LLC") }}</p>
              </div>
            </div>

            <!-- Login Form -->
            <form class="login-form" @submit.prevent="submit">
              <div class="input-stack">
                <ion-item lines="none" class="custom-item">
                  <ion-input
                    v-model="email"
                    type="text"
                    label-placement="stacked"
                    :label="__('Username')"
                    :placeholder="__('Enter your username')"
                    autocomplete="username"
                    inputmode="email"
                    class="custom-ion-input"
                  >
                    <ion-icon slot="start" :icon="personOutline" aria-hidden="true" class="input-icon" />
                  </ion-input>
                </ion-item>

                <ion-item lines="none" class="custom-item">
                  <ion-input
                    v-model="password"
                    type="password"
                    label-placement="stacked"
                    :label="__('Password')"
                    placeholder="••••••••"
                    autocomplete="current-password"
                    class="custom-ion-input"
                  >
                    <ion-icon slot="start" :icon="lockClosedOutline" aria-hidden="true" class="input-icon" />
                    <ion-input-password-toggle slot="end"></ion-input-password-toggle>
                  </ion-input>
                </ion-item>
              </div>

              <p v-if="errorMessage" class="error-msg anim-shake">
                <ion-icon :icon="alertCircleOutline" />
                {{ errorMessage }}
              </p>

              <ion-button
                expand="block"
                class="login-submit-btn"
                type="submit"
                :disabled="loading"
                @click="submit"
              >
                <ion-spinner v-if="loading" name="crescent" />
                <span v-else>{{ __("Sign In") }}</span>
              </ion-button>
            </form>
          </div>

          <!-- Flex spacer to push footer down -->
          <div class="flex-spacer"></div>

          <div class="custom-footer-standalone">
            <p class="copyright">© {{ new Date().getFullYear() }} Southwest Repair & Service</p>
          </div>
        </div>
      </div>

      <!-- Dialogs remain using FrappeUI as they are heavily integrated with the logic, but styled to match -->
      <Dialog v-model="resetPassword.showDialog" class="premium-dialog">
        <template #body-title>
          <h2 class="text-xl font-bold text-slate-900">{{ __("Reset Password") }}</h2>
        </template>
        <template #body-content>
          <p class="text-slate-600">{{ __("Your password has expired. Please reset your password to continue") }}</p>
        </template>
        <template #actions>
          <ion-button expand="block" color="dark" :href="resetPassword.link" target="_blank" rel="noopener noreferrer" class="dialog-btn">
            {{ __("Go to Reset Password page") }}
          </ion-button>
        </template>
      </Dialog>

      <Dialog v-model="otp.showDialog" class="premium-dialog">
        <template #body-title>
          <h2 class="text-xl font-bold text-slate-900">{{ __("OTP Verification") }}</h2>
        </template>
        <template #body-content>
          <p class="mb-4 text-sm text-slate-600" v-if="otp.verification.prompt">
            {{ otp.verification.prompt }}
          </p>

          <ion-item lines="none" class="custom-item-dialog">
            <ion-input
              v-model="otp.code"
              type="text"
              label-placement="stacked"
              :label="__('OTP Code')"
              placeholder="000000"
              autocomplete="one-time-code"
              inputmode="numeric"
            />
          </ion-item>

          <p v-if="errorMessage" class="error-msg mt-2">{{ errorMessage }}</p>

          <ion-button expand="block" color="dark" class="mt-6 dialog-btn" :disabled="loading" @click="submit">
            <ion-spinner v-if="loading" name="crescent" />
            <span v-else>{{ __("Verify") }}</span>
          </ion-button>
        </template>
      </Dialog>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonSpinner,
  IonItem,
  IonLabel,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonInputPasswordToggle,
} from "@ionic/vue"
import {
  personOutline,
  lockClosedOutline,
  alertCircleOutline,
} from 'ionicons/icons'
import { inject, reactive, ref } from "vue"
import { Dialog } from "frappe-ui"
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
  if (loading.value) return
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
.login-page-base {
  --background: #f1f5f9; /* Global background to prevent "stains" */
}

.login-page-content {
  --background: transparent;
  --offset-bottom: 0px !important;
  --keyboard-offset: 0px !important;
}

/* Hide scrollbar but allow functional scrolling for keyboard reflow */
.login-page-content::part(scroll) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.login-page-content::part(scroll)::-webkit-scrollbar {
  display: none;
}

.custom-toolbar {
  --background: #ffffff;
  --border-width: 0;
  --color: #0f172a;
  padding-top: 8px;
  padding-bottom: 8px;
}

.toolbar-brand {
  font-weight: 700;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #0f172a;
}

.login-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.login-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1; /* Occupy full ionic content height */
  width: 100%;
  align-items: center;
  padding: 16px;
  box-sizing: border-box;
}

/* Background decoration */
.blob {
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  filter: blur(100px);
  z-index: 0;
  opacity: 0.15;
}

.blob-1 {
  background: #fb923c; /* Light Southwest Orange */
  top: -150px;
  right: -150px;
}

.blob-2 {
  background: #60a5fa; /* Light Accent Blue */
  bottom: -200px;
  left: -200px;
}

.login-inner {
  width: 100%;
  max-width: 420px;
  background: transparent;
  padding: 16px 16px 0;
  z-index: 10;
  margin-top: auto; /* Push down to center */
}

.flex-spacer {
  flex: 1; /* Pushes content away from each other */
}

.custom-footer-standalone {
  width: 100%;
  padding: 16px;
  text-align: center;
  z-index: 10;
  margin-top: auto; /* Fallback for push */
}

.footer-content {
  text-align: center;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.brand-logo {
  height: 90px; /* Slightly smaller logo */
  width: auto;
  margin-bottom: 20px;
}

.brand-info {
  text-align: center;
}

.brand-name {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.brand-tagline {
  font-size: 13px;
  color: #64748b;
  margin: 2px 0 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.input-stack {
  display: flex;
  flex-direction: column;
  gap: 12px; /* Reduced gap */
  margin-bottom: 20px;
}

.custom-item {
  --background: #f8fafc;
  --border-radius: 16px;
  --padding-start: 16px;
  --padding-end: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 16px; /* Explicit border-radius for custom border */
  transition: all 0.2s ease;
  overflow: hidden; /* Ensure focus highlights don't overflow */
}

.custom-item:focus-within {
  border-color: #f97316;
  --background: #fff;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.06);
}

.custom-ion-input {
  --padding-top: 10px;
  --padding-bottom: 10px;
  color: #1e293b;
  font-size: 16px;
  font-weight: 500;
  --highlight-color-focused: transparent;
  --background: transparent;
}

/* Aggressive reset for the native input focus ring (the "blue box") */
.custom-ion-input::part(native) {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

.custom-ion-input::part(native):focus,
.custom-ion-input::part(native):active,
.custom-ion-input input:focus,
.custom-ion-input input:active {
  outline: none !important;
  box-shadow: none !important;
}

/* Global reset for any intercepted focus within this component */
:deep(input:focus),
:deep(input:active),
:deep(.native-input:focus) {
  outline: none !important;
  box-shadow: none !important;
}

.custom-ion-input::part(container) {
  outline: none !important;
}

.toggle-btn {
  --padding-start: 0;
  --padding-end: 0;
  margin: 0;
  height: 24px;
  color: #94a3b8;
}

.input-icon {
  margin-right: 12px;
  color: #94a3b8;
  font-size: 20px;
  margin-top: 12px;
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ef4444;
  font-size: 14px;
  margin: 0 0 16px;
  font-weight: 500;
}

.login-submit-btn {
  --background: #f97316; /* Southwest Orange */
  --background-activated: #ea580c;
  --border-radius: 16px;
  --height: 64px; /* Increased for mobile */
  --color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  margin: 12px 0 0;
  box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.2);
}

.copyright {
  font-size: 11px;
  color: #94a3b8;
  letter-spacing: 0.02em;
  margin: 0;
}

/* Animations */
.anim-shake {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

/* Dialog Styling Override */
:deep(.premium-dialog) {
  --dialog-border-radius: 24px;
}

.custom-item-dialog {
  --background: #f1f5f9;
  --border-radius: 12px;
  margin-bottom: 12px;
}

.dialog-btn {
  --border-radius: 12px;
  --height: 48px;
  font-weight: 600;
}
</style>
