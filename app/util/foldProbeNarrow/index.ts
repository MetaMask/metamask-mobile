export const clampToRange = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const isEvenLength = (value: string): boolean => value.length % 2 === 0;
