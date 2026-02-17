<template>
  <div class="modal-backdrop" v-if="isOpen">
    <div class="modal-content">
      <h2>Settings</h2>
      
      <div class="setting-item">
        <label>Auto-Rotate Camera</label>
        <button 
          class="toggle-btn" 
          :class="{ active: autoRotate }"
          @click="$emit('update:autoRotate', !autoRotate)"
        >
          {{ autoRotate ? 'ON' : 'OFF' }}
        </button>
      </div>

      <div class="setting-item">
        <label>Theme</label>
        <select 
          class="theme-select" 
          :value="theme" 
          @change="$emit('update:theme', ($event.target as HTMLSelectElement).value)"
        >
          <option value="dark">Dark</option>
          <option value="tokyo-night">Tokyo Night</option>
        </select>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" @click="$emit('close')">Resume</button>
        <button class="btn-danger" @click="$emit('returnToMenu')">Return to Main Menu</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean;
  autoRotate: boolean;
  theme: string;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'update:autoRotate', value: boolean): void;
  (e: 'update:theme', value: string): void;
  (e: 'returnToMenu'): void;
}>();
</script>

<style scoped>
.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  pointer-events: auto;
}

.modal-content {
  background: var(--modal-bg);
  border: 1px solid var(--glass-border);
  padding: 2rem;
  border-radius: 16px;
  width: 300px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  transition: background 0.3s, border-color 0.3s;
}

h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-color);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  color: var(--text-color);
  opacity: 0.9;
}

.toggle-btn {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  color: var(--text-color);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: #00aa44; /* Keep distinct for On state, or add a var if strictly needed. For now Keep green but maybe brighter? */
  background: rgba(0, 200, 100, 0.4);
  border-color: #00ff88;
}

.theme-select {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  color: var(--text-color);
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  outline: none;
}

.theme-select option {
  background: #222; /* Fallback for dropdown background usually needed as glass doesn't work well on options options */
  background: var(--bg-color);
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btn-secondary {
  padding: 0.8rem;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  color: var(--text-color);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-secondary:hover {
  background: var(--primary-btn-hover);
}

.btn-danger {
  padding: 0.8rem;
  background: rgba(220, 50, 50, 0.2);
  border: 1px solid rgba(220, 50, 50, 0.4);
  color: #ffaaaa;
  border-radius: 8px;
  cursor: pointer;
}

.btn-danger:hover {
  background: rgba(220, 50, 50, 0.4);
}
</style>
