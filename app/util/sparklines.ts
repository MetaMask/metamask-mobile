/**
 * Reduces `data` to at most `targetLength` evenly-distributed points.
 * Returns the original array unchanged when it is already short enough.
 */
export function downsample(data: number[], targetLength: number): number[] {
  if (data.length <= targetLength) return data;
  const result: number[] = [];
  const step = (data.length - 1) / (targetLength - 1);
  for (let i = 0; i < targetLength; i++) {
    result.push(data[Math.round(i * step)]);
  }
  return result;
}
