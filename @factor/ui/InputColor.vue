<template>
  <label
    class="text-input-size text-theme-700 bg-theme-100 hover:bg-theme-200 hover:border-theme-400 border-input-border inline-flex cursor-pointer items-center overflow-hidden rounded-md border"
    @click.stop
  >
    <div class="p-[.4em]" :for="inputId">
      <span
        class="wrap relative"
        :style="{ background: modelValue || `rgba(255,255,255,.5)` }"
        :class="classes"
      >
        <input
          :id="inputId"
          type="color"
          class="h-[1.3em] w-[1.3em] cursor-pointer opacity-0"
          :value="modelValue || '#edf1f3'"
          @input="handleEmit($event.target)"
        />
      </span>
    </div>

    <div class="inline-flex items-center pr-[.7em] font-mono text-[.8em]">
      <div
        class="text-theme-500 hover:text-theme-500"
        spellcheck="false"
        @click.stop="setEditing()"
        @input="onInput($event)"
      >
        {{ modelValue || "Select" }}
      </div>
      <div v-if="modelValue" class="rem ml-0.5 -mr-0.5">
        <div
          class="text-theme-400 hover:text-theme-500 cursor-pointer items-center p-0.5"
          @click.stop.prevent="removeColor()"
        >
          <div class="i-carbon-trash-can text-[10px]"></div>
        </div>
      </div>
    </div>
  </label>
</template>

<script lang="ts" setup>
import { vue, objectId, onResetUi } from "@factor/api"
const editing = vue.ref(false)
const editedValue = vue.ref("")
const inputId = vue.ref(`id${objectId()}`)
const setEditing = () => {
  editing.value = true
}

const handleEmit = (target: EventTarget | null): void => {
  const el = target as HTMLInputElement
  emit("update:modelValue", el.value != "#edf1f3" ? el.value : "")
}

const removeColor = (): void => {
  emit("update:modelValue", "")
}

onResetUi(() => {
  // for wysiwyg editing of values
  editing.value = false

  if (editedValue.value) {
    emit("update:modelValue", editedValue.value)

    editedValue.value = ""
  }
})

defineProps({
  modelValue: { type: String, default: undefined },
})
const emit = defineEmits<{
  (event: "update:modelValue", payload: string): void
}>()

const onInput = (ev: Event) => {
  const target = ev.target as HTMLElement
  const v = target.innerHTML

  if (/^#[\da-f]{6}$/i.test("#AABBCC")) {
    editedValue.value = v
  }
}

const classes = [
  "f-color-picker",
  "cursor-pointer",
  "ring-theme-300",
  "ring-2",
  "rounded-full",
  "active:opacity-75",
  "flex",
]
</script>
<style lang="less">
.f-color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}
.f-color-picker::-webkit-color-swatch {
  border: none;
}
</style>
