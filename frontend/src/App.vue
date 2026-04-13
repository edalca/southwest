<template>
  <ion-app>
    <ion-router-outlet />
    <InstallPWAPrompt />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import InstallPWAPrompt from '@/components/InstallPWAPrompt.vue';
</script>
