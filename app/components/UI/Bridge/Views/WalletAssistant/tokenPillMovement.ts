export type TokenPillMovement = 'gain' | 'loss' | 'neutral';

export const TOKEN_PILL_MOVEMENT_PRESENTATION: Record<
  TokenPillMovement,
  { arrow: string; background: string }
> = {
  gain: {
    arrow: ' ↗',
    background: 'bg-success-muted',
  },
  loss: {
    arrow: ' ↘',
    background: 'bg-error-muted',
  },
  neutral: {
    arrow: '',
    background: 'bg-muted',
  },
};

export const getTokenPillMovement = (
  priceChange24h: string | number | undefined,
): TokenPillMovement => {
  if (
    priceChange24h === undefined ||
    priceChange24h === null ||
    String(priceChange24h).trim() === ''
  ) {
    return 'neutral';
  }

  const change = Number(priceChange24h);
  if (!Number.isFinite(change) || change === 0) {
    return 'neutral';
  }

  return change > 0 ? 'gain' : 'loss';
};
