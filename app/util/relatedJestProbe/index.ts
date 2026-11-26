export const clampToRange = (
  value: number,
  min: number,
  max: number,
): number => {
  if (min > max) {
    throw new Error('min must not exceed max');
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export const isEvenLength = (input: string): boolean => input.length % 2 === 0;
