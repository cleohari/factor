<template>
  <div class="content-layout min-h-screen">
    <SiteHead />
    <router-view />
    <SiteFooter />
  </div>
</template>
<script lang="ts" setup>
import { useMeta, vue } from "@factor/api"
import SiteHead from "./el/SiteHead.vue"
import SiteFooter from "./el/SiteFooter.vue"
import ImgShare from "./img/share.jpg"
useMeta({
  title: vue.computed(() => {
    return `FactorJS Static Site Framework by Kaption Co.`
  }),
  meta: [
    {
      name: `description`,
      content:
        "A next-generation framework for building websites, blogs, and apps with JavaScript. Powered by Node, TypeScript, Vite.",
    },
    {
      vmid: "og:image",
      property: "og:image",
      content: ImgShare,
    },
  ],
})
</script>

<style lang="less">
@import "./styles.less";
</style>
