<template>
  <div class="go-info-panel">
    <div class="go-info-title">Go Info</div>

    <div class="go-info-grid">
      <div>Black Area</div>
      <div>{{ blackArea }}</div>
      <div>White Area</div>
      <div>{{ whiteArea }}</div>
      <div>Black Captures</div>
      <div>{{ blackCaptures }}</div>
      <div>White Captures</div>
      <div>{{ whiteCaptures }}</div>
    </div>

    <div class="go-info-actions">
      <button type="button" class="info-btn" :disabled="!canUndo" @click="$emit('undo')">Undo</button>
      <button type="button" class="info-btn danger" @click="$emit('restart')">Restart</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  canUndo: boolean;
  blackArea: number;
  whiteArea: number;
  blackCaptures: number;
  whiteCaptures: number;
}>();

defineEmits<{
  (e: 'undo'): void;
  (e: 'restart'): void;
}>();
</script>

<style scoped>
.go-info-panel {
  position: absolute;
  top: 200px;
  left: 16px;
  z-index: 20;
  width: 220px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(15, 15, 15, 0.82);
  color: #f2f2f2;
  font-size: 12px;
  backdrop-filter: blur(4px);
}

.go-info-title {
  margin-bottom: 10px;
  font-weight: 700;
}

.go-info-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 10px;
  margin-bottom: 12px;
}

.go-info-actions {
  display: flex;
  gap: 8px;
}

.info-btn {
  flex: 1;
  border: 1px solid #666;
  background: #1f1f1f;
  color: #f2f2f2;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}

.info-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.info-btn.danger {
  border-color: #8b3d3d;
  background: #3a1f1f;
}
</style>
