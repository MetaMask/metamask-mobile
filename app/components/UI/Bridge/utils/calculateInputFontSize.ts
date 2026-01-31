export const calculateInputFontSize = (length: number): number => {
  if (length <= 10) return 40;
  if (length <= 15) return 35;
  if (length <= 20) return 30;
  if (length <= 25) return 25;
  return 20;
};
