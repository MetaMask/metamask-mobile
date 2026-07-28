import {
  getTokenPillMovement,
  TOKEN_PILL_MOVEMENT_PRESENTATION,
} from './tokenPillMovement';

describe('getTokenPillMovement', () => {
  it.each([
    ['12.5', 'gain'],
    [-0.1, 'loss'],
    ['-76.73', 'loss'],
    ['0', 'neutral'],
    [undefined, 'neutral'],
    ['not-a-number', 'neutral'],
  ] as const)('classifies %p as %s', (change, expected) => {
    expect(getTokenPillMovement(change)).toBe(expected);
  });

  it('uses error styling and a down arrow for losses', () => {
    expect(TOKEN_PILL_MOVEMENT_PRESENTATION.loss).toEqual({
      arrow: ' ↘',
      background: 'bg-error-muted',
    });
  });
});
