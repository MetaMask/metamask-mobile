/** Formats total seconds as m:ss (e.g. 90 → "1:30", 9 → "0:09"). */
export function formatQuoteCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}:${paddedSeconds}`;
}
