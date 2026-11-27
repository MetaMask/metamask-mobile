import { isPendingActionResumable } from './isPendingActionResumable';

const ONBOARDING_TARGET = {
  kind: 'trader',
  traderId: 'trader-1',
  stage: 'onboarding',
} as const;

describe('isPendingActionResumable', () => {
  it('resumes a trader link the user chose to join from', () => {
    const result = isPendingActionResumable({
      previewTarget: ONBOARDING_TARGET,
      hasPendingEntry: false,
      path: 'x',
    });

    expect(result).toBe(true);
  });

  it('does not resume a link that is still only being previewed', () => {
    const result = isPendingActionResumable({
      previewTarget: { ...ONBOARDING_TARGET, stage: 'previewing' },
      hasPendingEntry: false,
      path: 'manual',
    });

    expect(result).toBe(false);
  });

  it('resumes a gated action on the manual path', () => {
    const result = isPendingActionResumable({
      previewTarget: null,
      hasPendingEntry: true,
      path: 'manual',
    });

    expect(result).toBe(true);
  });

  it('drops a gated action on the X path', () => {
    const result = isPendingActionResumable({
      previewTarget: null,
      hasPendingEntry: true,
      path: 'x',
    });

    expect(result).toBe(false);
  });

  it('has nothing to resume when the user opened onboarding directly', () => {
    const result = isPendingActionResumable({
      previewTarget: null,
      hasPendingEntry: false,
      path: 'manual',
    });

    expect(result).toBe(false);
  });
});
