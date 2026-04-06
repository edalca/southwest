<template>
  <ion-page>
    <ion-content class="ion-padding">
      <div class="flex h-screen w-screen flex-col justify-center bg-white">
        <div class="flex flex-col mx-auto gap-3 items-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 mx-auto">
            <FeatherIcon name="tool" class="h-7 w-7 text-white" />
          </div>
          <div class="text-3xl font-semibold text-gray-900 text-center">
            {{ __("Login to Southwest") }}
          </div>
        </div>

        <div class="mx-auto mt-10 w-full px-8 sm:w-96">
          <form class="flex flex-col space-y-4" @submit.prevent="submit">
            <Input
              :label="__('Username')"
              :placeholder="__('your username')"
              v-model="email"
              type="text"
              autocomplete="username"
            />
            <Input
              :label="__('Password')"
              type="password"
              placeholder="••••••••"
              v-model="password"
              autocomplete="current-password"
            />
            <ErrorMessage :message="errorMessage" />
            <Button
              :loading="loading"
              variant="solid"
              class="disabled:bg-gray-700 disabled:text-white !mt-6"
            >
              {{ __("Login") }}
            </Button>
          </form>
        </div>
      </div>

      <Dialog v-model="resetPassword.showDialog">
        <template #body-title>
          <h2 class="text-lg font-bold">{{ __("Reset Password") }} </h2>
        </template>
        <template #body-content>
          <p>
            {{ __("Your password has expired. Please reset your password to continue") }}
          </p>
        </template>
        <template #actions>
          <a
            class="inline-flex items-center justify-center gap-2 transition-colors focus:outline-none text-white bg-gray-900 hover:bg-gray-800 active:bg-gray-700 focus-visible:ring focus-visible:ring-gray-400 h-7 text-base px-2 rounded"
            :href="resetPassword.link"
            target="_blank"
          >
            {{ __("Go to Reset Password page") }}
          </a>
        </template>
      </Dialog>

      <Dialog v-model="otp.showDialog">
        <template #body-title>
          <h2 class="text-lg font-bold">{{ __("OTP Verification") }}</h2>
        </template>
        <template #body-content>
          <p class="mb-4" v-if="otp.verification.prompt">
            {{ otp.verification.prompt }}
          </p>

          <form class="flex flex-col space-y-4" @submit.prevent="submit">
            <Input
              :label="__('OTP Code')"
              type="text"
              placeholder="000000"
              v-model="otp.code"
              autocomplete="one-time-code"
            />
            <ErrorMessage :message="errorMessage" />
            <Button
              :loading="loading"
              variant="solid"
              class="disabled:bg-gray-700 disabled:text-white !mt-6"
            >
              {{ __("Verify") }}
            </Button>
          </form>
        </template>
      </Dialog>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent } from "@ionic/vue"
import { inject, reactive, ref } from "vue"
import { Input, Button, ErrorMessage, Dialog, FeatherIcon } from "frappe-ui"
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
      errorMessage.value = error?.message ?? __("Login failed.")
    }
  } finally {
    loading.value = false
  }
}
</script>
