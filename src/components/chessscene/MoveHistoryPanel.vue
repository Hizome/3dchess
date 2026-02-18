<template>
  <div class="move-history-panel">
    <div class="move-history-title">Moves</div>
    <div class="move-history-list">
      <div v-if="rows.length === 0" class="move-history-empty">No moves yet</div>
      <div v-for="row in rows" :key="row.moveNumber" class="move-row">
        <span class="move-no">{{ row.moveNumber }}.</span>
        <span class="move-san">{{ row.white || '-' }}</span>
        <span class="move-san">{{ row.black || '-' }}</span>
      </div>
    </div>
    <div class="move-history-actions">
      <button type="button" class="history-btn" :disabled="!canUndo" @click="$emit('undo')">Undo</button>
      <button type="button" class="history-btn danger" @click="$emit('restart')">Restart</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  rows: Array<{ moveNumber: number; white: string; black: string }>;
  canUndo: boolean;
}>();

defineEmits<{
  (e: 'undo'): void;
  (e: 'restart'): void;
}>();
</script>

<style scoped>
.move-history-panel {
  position: absolute;
  top: 200px;
  left: 16px;
  z-index: 20;
  width: 260px;
  max-height: calc(100% - 32px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-radius: 8px;
  background: rgba(15, 15, 15, 0.82);
  color: #f2f2f2;
  font-size: 12px;
  backdrop-filter: blur(4px);
}

.move-history-title {
  margin-bottom: 8px;
  font-weight: 700;
}

.move-history-list {
  flex: 1;
  overflow-y: scroll;
  overflow-x: hidden;
  min-height: 152px;
  max-height: 152px;
  scrollbar-width: thin;
  scrollbar-color: rgba(210, 210, 210, 0.65) rgba(255, 255, 255, 0.08);
}

.move-history-empty {
  color: #9a9a9a;
  font-size: 12px;
  padding: 6px 0;
}

.move-history-list::-webkit-scrollbar {
  width: 10px;
}

.move-history-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.move-history-list::-webkit-scrollbar-thumb {
  background: rgba(210, 210, 210, 0.65);
  border-radius: 8px;
}

.move-row {
  display: grid;
  grid-template-columns: 32px 1fr 1fr;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.move-no {
  color: #9fd4ff;
}

.move-san {
  color: #e6e6e6;
}

.move-history-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.history-btn {
  flex: 1;
  border: 1px solid #666;
  background: #1f1f1f;
  color: #f2f2f2;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}

.history-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.history-btn.danger {
  border-color: #8b3d3d;
  background: #3a1f1f;
}
</style>
