<template>
  <div class="app-container">
    <div class="game-wrapper">
      <ChessScene
        v-if="gameStarted && gameMode === 'chess'"
        :playerColor="playerColor" 
        :isLocked="isCameraLocked"
        :autoRotate="autoRotate"
        @turn-changed="handleTurnChange"
      />

      <XiangqiScene
        v-else-if="gameStarted && gameMode === 'xiangqi'"
        :playerColor="playerColor"
        :isLocked="isCameraLocked"
        :autoRotate="autoRotate"
        @turn-changed="handleTurnChange"
      />

      <GoScene
        v-else-if="gameStarted && gameMode === 'go'"
        :playerColor="playerColor"
        :isLocked="isCameraLocked"
        :autoRotate="autoRotate"
        @turn-changed="handleTurnChange"
      />
      
      <!-- Main Menu -->
      <div v-else class="menu-overlay">
        <h1>3D Board Games</h1>
        <div class="menu-content">
          <div class="menu-section">
            <button @click="startChessGame" class="menu-btn primary-btn" :disabled="isLoading">Play Chess</button>
          </div>
          <div class="menu-section">
            <button @click="startXiangqiGame" class="menu-btn primary-btn" :disabled="isLoading">Play Xiangqi</button>
          </div>
          <div class="menu-section">
            <button @click="startGoGame" class="menu-btn primary-btn" :disabled="isLoading">Play Go</button>
          </div>
          <button class="settings-icon-btn" @click="showSettings = true">⚙️ Settings</button>
        </div>
      </div>

      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-card">
          <div class="loading-title">Loading {{ loadingModeLabel }}</div>
          <div class="loading-progress-text">{{ loadingProgress }}%</div>
          <div class="loading-progress-track">
            <div class="loading-progress-fill" :style="{ width: `${loadingProgress}%` }"></div>
          </div>
        </div>
      </div>

      <!-- In-Game HUD -->
      <div v-if="gameStarted" class="hud-layer">
        <div class="player-panel top-left">
          <span class="icon">{{ topLeftPlayerLabel }}</span>
        </div>
        
        <div class="player-panel top-right">
          <span class="icon">{{ topRightPlayerLabel }}</span>
        </div>
        
        <!-- Action Controls -->
        <div class="action-controls">
          <button class="settings-btn" title="Settings" @click="showSettings = true">⚙️</button>
          
          <!-- Camera Lock System -->
          <div class="camera-controls">
            <!-- If Locked: Show Unlock Button -->
            <Transition name="fade" mode="out-in">
              <button 
                v-if="isCameraLocked" 
                class="settings-btn camera-btn" 
                @click="unlockCamera" 
                title="Unlock Camera"
                key="unlock"
              >
                🔒
              </button>

              <!-- If Unlocked: Show Lock Options -->
              <div v-else class="lock-container" v-click-outside="closeLockOptions" key="lock-container">
                 <!-- Main Lock Button (Triggers options) -->
                 <button 
                   v-if="!showCameraOptions"
                   class="settings-btn camera-btn" 
                   @click.stop="showCameraOptions = true" 
                   title="Lock Camera"
                 >
                   🔓
                 </button>

                 <!-- Options (Replaces Main Button) -->
                 <div v-else class="lock-options">
                   <button class="settings-btn camera-btn sub-btn white-lock" @click="lockCameraTo('white')" title="Lock to White"></button>
                   <button class="settings-btn camera-btn sub-btn black-lock" @click="lockCameraTo('black')" title="Lock to Black"></button>
                 </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Shared Settings Modal -->
      <SettingsModal 
        v-if="showSettings" 
        :isOpen="showSettings"
        v-model:autoRotate="autoRotate"
        v-model:theme="currentTheme"
        @close="showSettings = false"
        @returnToMenu="returnToMenu"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ChessScene from './components/ChessScene.vue';
import XiangqiScene from './components/XiangqiScene.vue';
import GoScene from './components/GoScene.vue';
import SettingsModal from './components/SettingsModal.vue';
import { AssetManager } from './utils/AssetManager';
import boardModelUrl from './assets/Board.glb?url';
import blackPawnModelUrl from './assets/bp.glb?url';
import whitePawnModelUrl from './assets/wp.glb?url';
import blackRookModelUrl from './assets/br.glb?url';
import whiteRookModelUrl from './assets/wr.glb?url';
import blackKnightModelUrl from './assets/bn.glb?url';
import whiteKnightModelUrl from './assets/wn.glb?url';
import blackBishopModelUrl from './assets/bb.glb?url';
import whiteBishopModelUrl from './assets/wb.glb?url';
import blackKingModelUrl from './assets/bk.glb?url';
import whiteKingModelUrl from './assets/wk.glb?url';
import blackQueenModelUrl from './assets/bq.glb?url';
import whiteQueenModelUrl from './assets/wq.glb?url';
import goBoardModelUrl from './assets/go_board.glb?url';

const gameStarted = ref(false);
const gameMode = ref<'chess' | 'xiangqi' | 'go' | null>(null);
const playerColor = ref('white'); 
const isCameraLocked = ref(true);
const showSettings = ref(false);
const autoRotate = ref(false);
const showCameraOptions = ref(false);
const currentTheme = ref('dark');
const isLoading = ref(false);
const loadingProgress = ref(0);
const loadingMode = ref<'chess' | 'xiangqi' | 'go' | null>(null);
const assetManager = new AssetManager();

const CHESS_ASSET_URLS = [
  boardModelUrl,
  blackPawnModelUrl,
  whitePawnModelUrl,
  blackRookModelUrl,
  whiteRookModelUrl,
  blackKnightModelUrl,
  whiteKnightModelUrl,
  blackBishopModelUrl,
  whiteBishopModelUrl,
  blackKingModelUrl,
  whiteKingModelUrl,
  blackQueenModelUrl,
  whiteQueenModelUrl
];

const GO_ASSET_URLS = [goBoardModelUrl];

const topLeftPlayerLabel = computed(() => {
  if (gameMode.value === 'go') return '👤 Player 2 (White)';
  if (gameMode.value === 'xiangqi') return '👤 Player 2 (Black)';
  return '👤 Player 2 (Black)';
});

const topRightPlayerLabel = computed(() => {
  if (gameMode.value === 'go') return '👤 Player 1 (Black)';
  if (gameMode.value === 'xiangqi') return '👤 Player 1 (Red)';
  return '👤 Player 1 (White)';
});

const loadingModeLabel = computed(() => {
  if (loadingMode.value === 'go') return 'Go';
  if (loadingMode.value === 'xiangqi') return 'Xiangqi';
  if (loadingMode.value === 'chess') return 'Chess';
  return 'Game';
});

watch(currentTheme, (newTheme: string) => {
  document.body.setAttribute('data-theme', newTheme === 'dark' ? '' : 'tokyo-night');
});

const getAssetUrlsByMode = (mode: 'chess' | 'xiangqi' | 'go') => {
  if (mode === 'chess') return CHESS_ASSET_URLS;
  if (mode === 'go') return GO_ASSET_URLS;
  return [];
};

const startGame = async (mode: 'chess' | 'xiangqi' | 'go') => {
  if (isLoading.value) return;

  isLoading.value = true;
  loadingMode.value = mode;
  loadingProgress.value = 0;

  try {
    const assets = getAssetUrlsByMode(mode);
    await assetManager.preloadModels(assets, (progress) => {
      loadingProgress.value = Math.max(0, Math.min(100, Math.round(progress * 100)));
    });
  } catch (error) {
    console.warn(`Preloading assets failed for ${mode}, entering with runtime loading fallback.`, error);
  }

  loadingProgress.value = 100;
  gameMode.value = mode;
  playerColor.value = 'white';
  isCameraLocked.value = true;
  gameStarted.value = true;

  window.setTimeout(() => {
    isLoading.value = false;
  }, 120);
};

const startChessGame = () => startGame('chess');
const startXiangqiGame = () => startGame('xiangqi');
const startGoGame = () => startGame('go');

const returnToMenu = () => {
  gameStarted.value = false;
  gameMode.value = null;
  showSettings.value = false;
  isCameraLocked.value = true;
  playerColor.value = 'white';
};

const unlockCamera = () => {
  isCameraLocked.value = false;
  showCameraOptions.value = false;
};

const lockCameraTo = (color: string) => {
  playerColor.value = color;
  isCameraLocked.value = true;
  showCameraOptions.value = false;
};

const handleTurnChange = (turnColor: string) => {
  if (autoRotate.value) {
    playerColor.value = turnColor === 'w' ? 'white' : 'black';
  }
};

const closeLockOptions = () => {
  showCameraOptions.value = false;
};

// Simple click-outside directive
const vClickOutside = {
  mounted(el: any, binding: any) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el: any) {
    document.body.removeEventListener('click', el.clickOutsideEvent);
  },
};
</script>

<style>
:root {
  --glass: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --blur: blur(10px);
}

body, html, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
}

.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.game-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.menu-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  text-align: center;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 15vh; /* Fixed position for title */
}

.menu-overlay h1 {
  font-size: 3rem;
  margin-bottom: 6rem;
  background: var(--text-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
}

.menu-section {
  margin-bottom: 2.5rem;
}

.menu-section h3 {
  color: #bbb;
  margin-bottom: 1rem;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.menu-buttons {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

.menu-btn {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--blur);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  min-width: 160px;
}

.menu-btn:hover {
  background: var(--primary-btn-hover);
  transform: translateY(-2px);
}

.menu-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.white-btn { background: var(--primary-btn); }
.black-btn { background: var(--primary-btn); border-color: var(--glass-border); }

.settings-icon-btn {
  margin-top: 1rem;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: #aaa;
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-icon-btn:hover {
  border-color: white;
  color: white;
}

.menu-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  align-items: center;
}

.primary-btn {
  width: 240px;
  background: rgba(255,255,255,0.08); /* Keep this subtly different or use var? Let's use var */
  background: var(--primary-btn);
}

.back-link {
  margin-top: 2rem;
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.back-link:hover { color: white; }

.hud-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.player-panel {
  position: absolute;
  padding: 0.8rem 1.2rem;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--blur);
  border-radius: 12px;
  pointer-events: auto;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.top-left { top: 2rem; left: 2rem; }
.top-right { top: 2rem; right: 2rem; }

.action-controls {
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  gap: 1rem;
  flex-direction: column-reverse;
  pointer-events: auto;
}

.camera-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.lock-options {
  display: flex;
  gap: 0.5rem;
  flex-direction: row; /* Side by side buttons */
}

.settings-btn {
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--blur);
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
}

.camera-btn { font-size: 1.2rem; }
.sub-btn { 
  width: 45px; 
  height: 45px; 
  font-size: 0.9rem;
  border-radius: 22.5px;
}

.settings-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
}

.camera-btn:hover {
  transform: scale(1.1); /* Don't rotate camera button */
}

/* Transitions for Lock Icon changes */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.white-lock {
  background: #ffffff !important;
  border: 4px solid #000000 !important;
}

.black-lock {
  background: #000000 !important;
  border: 4px solid #ffffff !important;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: rgba(6, 10, 18, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.loading-card {
  width: min(460px, 82vw);
  padding: 1.1rem 1rem 1.2rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(16, 24, 36, 0.82);
}

.loading-title {
  color: #eaf4ff;
  font-size: 1rem;
  font-weight: 700;
}

.loading-progress-text {
  color: #b8cadf;
  font-size: 0.9rem;
  margin: 0.45rem 0 0.6rem;
}

.loading-progress-track {
  width: 100%;
  height: 9px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  overflow: hidden;
}

.loading-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3d8fff, #7dc7ff);
  transition: width 120ms ease-out;
}
</style>
