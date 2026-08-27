export function buildPerpsMarketContextKey(
  network: string,
  provider: string | undefined,
  hip3ConfigVersion: number,
): string {
  return `${network}|${provider ?? 'unknown'}|${hip3ConfigVersion}`;
}
