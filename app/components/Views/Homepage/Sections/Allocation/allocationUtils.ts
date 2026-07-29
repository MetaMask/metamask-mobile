export interface AllocationValue {
  key: string;
  value: number;
}

export interface AllocationValueWithPercentage extends AllocationValue {
  percentage: number;
}

export const buildAllocationValues = (
  values: AllocationValue[],
): AllocationValueWithPercentage[] => {
  const positiveValues = values.filter(
    ({ value }) => Number.isFinite(value) && value > 0,
  );
  const total = positiveValues.reduce((sum, { value }) => sum + value, 0);

  if (total === 0) {
    return [];
  }

  return positiveValues
    .map((item) => ({
      ...item,
      percentage: (item.value / total) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage);
};
