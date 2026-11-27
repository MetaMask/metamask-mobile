export const doubleIfEven = (value: number): number => {
  if (value % 2 === 0) {
    return value * 2;
  }
  return value;
};
