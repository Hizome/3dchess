import { ref } from 'vue';

export const useKnightDebug = (onChanged: () => void) => {
  const blackKnightScale = ref(28);
  const blackKnightOffsetX = ref(3.45);
  const blackKnightOffsetY = ref(-1.1);
  const blackKnightOffsetZ = ref(2.45);

  const whiteKnightScale = ref(28);
  const whiteKnightOffsetX = ref(0.45);
  const whiteKnightOffsetY = ref(-1.1);
  const whiteKnightOffsetZ = ref(-4.25);

  const adjustBlackKnightScale = (delta: number) => {
    blackKnightScale.value = Math.max(0.05, blackKnightScale.value + delta);
    onChanged();
  };

  const adjustBlackKnightOffsetX = (delta: number) => {
    blackKnightOffsetX.value += delta;
    onChanged();
  };

  const adjustBlackKnightOffsetY = (delta: number) => {
    blackKnightOffsetY.value += delta;
    onChanged();
  };

  const adjustBlackKnightOffsetZ = (delta: number) => {
    blackKnightOffsetZ.value += delta;
    onChanged();
  };

  const adjustWhiteKnightScale = (delta: number) => {
    whiteKnightScale.value = Math.max(0.05, whiteKnightScale.value + delta);
    onChanged();
  };

  const adjustWhiteKnightOffsetX = (delta: number) => {
    whiteKnightOffsetX.value += delta;
    onChanged();
  };

  const adjustWhiteKnightOffsetY = (delta: number) => {
    whiteKnightOffsetY.value += delta;
    onChanged();
  };

  const adjustWhiteKnightOffsetZ = (delta: number) => {
    whiteKnightOffsetZ.value += delta;
    onChanged();
  };

  return {
    blackKnightScale,
    blackKnightOffsetX,
    blackKnightOffsetY,
    blackKnightOffsetZ,
    whiteKnightScale,
    whiteKnightOffsetX,
    whiteKnightOffsetY,
    whiteKnightOffsetZ,
    adjustBlackKnightScale,
    adjustBlackKnightOffsetX,
    adjustBlackKnightOffsetY,
    adjustBlackKnightOffsetZ,
    adjustWhiteKnightScale,
    adjustWhiteKnightOffsetX,
    adjustWhiteKnightOffsetY,
    adjustWhiteKnightOffsetZ
  };
};
