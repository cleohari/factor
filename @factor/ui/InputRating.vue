<template>
  <div class="outline-none" tabindex="0" @keyup="selectByLetter($event)">
    <div class="flex space-x-2">
      <InputElBox
        v-for="item in parsedList"
        :key="item"
        :selected="item == modelValue ? true : false"
        :not-selected="
          typeof modelValue != 'undefined' && item != modelValue ? true : false
        "
        :prefix="item"
        :label="item"
        :icon="icon"
        @click="selectItem(item)"
      ></InputElBox>
    </div>
    <div v-if="labels" class="text-theme-600 mt-2 grid grid-cols-3 text-xs">
      <div>{{ labels.low }}</div>
      <div class="text-center">{{ labels.middle }}</div>
      <div class="text-right">{{ labels.high }}</div>
    </div>
    <!-- For validation -->
    <input
      ref="validEl"
      class="pointer-events-none float-left h-0 w-0 p-0 opacity-0"
      type="text"
      :value="modelValue"
      :isValid="isValid"
    />
  </div>
</template>
<script lang="ts" setup>
import { vue } from "@factor/api"
import InputElBox from "./InputElBox.vue"

const props = defineProps({
  modelValue: { type: [Number], default: undefined },
  countStart: {
    type: [Number, String],
    default: 0,
  },
  countEnd: {
    type: [Number, String],
    default: 5,
  },
  icon: {
    type: String,
    default: undefined,
  },
  labels: {
    type: Object as vue.PropType<{
      low?: string
      middle?: string
      high?: string
    }>,
    default: undefined,
  },
})

const attrs = vue.useAttrs()

const validEl = vue.ref<HTMLInputElement>()
const isValid = vue.ref(-1)

const emit = defineEmits<{
  (event: "update:modelValue", payload: number | undefined): void
  (event: "continue", payload: number | undefined): void
}>()

const selectItem = (val?: number) => {
  emit("update:modelValue", val)

  setTimeout(() => {
    if (typeof val !== "undefined") {
      emit("continue", val)
    }
  }, 500)
}

const parsedList = vue.computed<number[]>(() => {
  const list: number[] = []
  for (var i = +props.countStart; i <= +props.countEnd; i++) {
    list.push(i)
  }
  return list
})

const selectByLetter = (ev: KeyboardEvent) => {
  const keyVal = Number.parseInt(ev.key)

  const index = parsedList.value.indexOf(keyVal)
  const val = parsedList.value[index]
  if (val) selectItem(val)
}

vue.onMounted(() => {
  vue.watch(
    () => props.modelValue,
    (val) => {
      const min = typeof attrs.required != "undefined" ? 1 : 0

      if (min && !val) {
        validEl.value?.setCustomValidity(`Please select one`)
        isValid.value = 0
      } else {
        validEl.value?.setCustomValidity("")
        isValid.value = 1
      }
    },
    { immediate: true },
  )
})
</script>
