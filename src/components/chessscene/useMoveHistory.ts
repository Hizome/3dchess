import { computed, ref } from 'vue';
import type { GameLogic } from '../../logic/GameLogic';

export type MoveHistoryRow = { moveNumber: number; white: string; black: string };

export const useMoveHistory = (gameLogic: GameLogic) => {
  const moveHistoryRows = ref<MoveHistoryRow[]>([]);
  const moveCount = ref(0);
  const canUndo = computed(() => moveCount.value > 0);

  const syncMoveHistory = () => {
    const history = gameLogic.getHistory() as Array<{ san: string }>;
    moveCount.value = history.length;
    const rows: MoveHistoryRow[] = [];

    for (let i = 0; i < history.length; i += 2) {
      rows.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: history[i]?.san ?? '',
        black: history[i + 1]?.san ?? ''
      });
    }

    moveHistoryRows.value = rows;
  };

  return {
    moveHistoryRows,
    moveCount,
    canUndo,
    syncMoveHistory
  };
};
