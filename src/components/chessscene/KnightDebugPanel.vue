<template>
  <div class="piece-debug-panel">
    <div class="piece-debug-title">Knight Debug</div>

    <div class="piece-debug-subtitle">Black Knight</div>
    <div class="piece-debug-row">
      <button type="button" @click="$emit('black-scale', -0.1)">Scale -</button>
      <button type="button" @click="$emit('black-scale', 0.1)">Scale +</button>
    </div>
    <div class="piece-debug-row">
      <button type="button" @click="$emit('black-offset-x', -0.05)">X -</button>
      <button type="button" @click="$emit('black-offset-x', 0.05)">X +</button>
    </div>
    <div class="piece-debug-row">
      <button type="button" @click="$emit('black-offset-y', -0.05)">Y -</button>
      <button type="button" @click="$emit('black-offset-y', 0.05)">Y +</button>
    </div>
    <div class="piece-debug-row">
      <button type="button" @click="$emit('black-offset-z', -0.05)">Z -</button>
      <button type="button" @click="$emit('black-offset-z', 0.05)">Z +</button>
    </div>
    <div class="piece-debug-values">
      <div>b scale: {{ blackScale.toFixed(2) }}</div>
      <div>b offsetX: {{ blackOffsetX.toFixed(2) }}</div>
      <div>b offsetY: {{ blackOffsetY.toFixed(2) }}</div>
      <div>b offsetZ: {{ blackOffsetZ.toFixed(2) }}</div>
    </div>

    <div class="piece-debug-subtitle">White Knight</div>
    <div class="piece-debug-row">
      <button type="button" @click="$emit('white-scale', -0.1)">Scale -</button>
      <button type="button" @click="$emit('white-scale', 0.1)">Scale +</button>
    </div>
    <div class="piece-debug-row">
      <button type="button" @click="$emit('white-offset-x', -0.05)">X -</button>
      <button type="button" @click="$emit('white-offset-x', 0.05)">X +</button>
    </div>
    <div class="piece-debug-row">
      <button type="button" @click="$emit('white-offset-y', -0.05)">Y -</button>
      <button type="button" @click="$emit('white-offset-y', 0.05)">Y +</button>
    </div>
    <div class="piece-debug-row">
      <button type="button" @click="$emit('white-offset-z', -0.05)">Z -</button>
      <button type="button" @click="$emit('white-offset-z', 0.05)">Z +</button>
    </div>
    <div class="piece-debug-values">
      <div>w scale: {{ whiteScale.toFixed(2) }}</div>
      <div>w offsetX: {{ whiteOffsetX.toFixed(2) }}</div>
      <div>w offsetY: {{ whiteOffsetY.toFixed(2) }}</div>
      <div>w offsetZ: {{ whiteOffsetZ.toFixed(2) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  blackScale: number;
  blackOffsetX: number;
  blackOffsetY: number;
  blackOffsetZ: number;
  whiteScale: number;
  whiteOffsetX: number;
  whiteOffsetY: number;
  whiteOffsetZ: number;
}>();

defineEmits<{
  (e: 'black-scale', delta: number): void;
  (e: 'black-offset-x', delta: number): void;
  (e: 'black-offset-y', delta: number): void;
  (e: 'black-offset-z', delta: number): void;
  (e: 'white-scale', delta: number): void;
  (e: 'white-offset-x', delta: number): void;
  (e: 'white-offset-y', delta: number): void;
  (e: 'white-offset-z', delta: number): void;
}>();
</script>

<style scoped>
.piece-debug-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 20;
  width: 240px;
  max-height: calc(100% - 32px);
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: rgba(15, 15, 15, 0.82);
  color: #f2f2f2;
  font-size: 12px;
  backdrop-filter: blur(4px);
}

.piece-debug-title {
  margin-bottom: 8px;
  font-weight: 700;
}

.piece-debug-subtitle {
  margin: 10px 0 6px;
  color: #9fd4ff;
  font-weight: 600;
}

.piece-debug-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.piece-debug-row button {
  border: 1px solid #666;
  background: #1f1f1f;
  color: #f2f2f2;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
}

.piece-debug-row button:hover {
  background: #2a2a2a;
}

.piece-debug-values {
  display: grid;
  gap: 2px;
  color: #d0d0d0;
}
</style>
