export const clampPercentage = (value: number): number => {
  if (Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
};

export const formatPercentage = (value: number): string => {
  const clamped = clampPercentage(value);
  if (clamped === 0) {
    return '0%';
  }
  if (clamped === 100) {
    return '100%';
  }
  return `${clamped.toFixed(1)}%`;
};

export const describeBand = (value: number): string => {
  const clamped = clampPercentage(value);
  if (clamped < 25) {
    return 'low';
  }
  if (clamped < 75) {
    return 'medium';
  }
  return 'high';
};
