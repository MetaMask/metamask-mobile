import { ImpactMoment, NotificationMoment } from '../catalog';
import { createHapticsJestMock } from './createHapticsJestMock';

describe('createHapticsJestMock', () => {
  it('reuses catalog ImpactMoment and NotificationMoment references', () => {
    const mock = createHapticsJestMock();
    expect(mock.ImpactMoment).toBe(ImpactMoment);
    expect(mock.NotificationMoment).toBe(NotificationMoment);
  });

  it('applies overrides after defaults', () => {
    const customPlayImpact = jest.fn();
    const mock = createHapticsJestMock({ playImpact: customPlayImpact });
    expect(mock.playImpact).toBe(customPlayImpact);
  });

  it('exposes useHaptics returning the same play stubs', () => {
    const mock = createHapticsJestMock();
    const fromHook = mock.useHaptics();
    expect(fromHook.playImpact).toBe(mock.playImpact);
  });

  it('matches useHaptics production surface (no top-level-only playNotification)', () => {
    const mock = createHapticsJestMock();
    const fromHook = mock.useHaptics();
    expect(fromHook).not.toHaveProperty('playNotification');
    expect(Object.keys(fromHook).sort()).toEqual(
      [
        'playErrorNotification',
        'playImpact',
        'playSelection',
        'playSuccessNotification',
        'playWarningNotification',
      ].sort(),
    );
  });
});
