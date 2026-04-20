import { ImpactMoment, NotificationMoment } from '../catalog';

export interface HapticsJestModuleMock {
  playImpact: jest.Mock;
  playNotification: jest.Mock;
  playSelection: jest.Mock;
  playSuccessNotification: jest.Mock;
  playErrorNotification: jest.Mock;
  playWarningNotification: jest.Mock;
  useHaptics: jest.Mock;
  ImpactMoment: typeof ImpactMoment;
  NotificationMoment: typeof NotificationMoment;
}

/**
 * Builds the mocked surface of `app/util/haptics` for Jest.
 *
 * For Jest, prefer `jest.mock('…/util/haptics')` with no factory so
 * `app/util/haptics/__mocks__/index.ts` applies (no `require()`, no ESM hoisting TDZ).
 * Use `createHapticsJestMock()` directly only in that manual mock or in unit tests
 * for `createHapticsJestMock` itself.
 *
 * Reuses real `ImpactMoment` / `NotificationMoment` from the catalog; only `play*`
 * and `useHaptics` are stubbed.
 *
 * @param overrides - Replace fields (e.g. `{ useHaptics: jest.fn() }` for custom hook tests).
 */
export function createHapticsJestMock(
  overrides: Partial<HapticsJestModuleMock> = {},
): HapticsJestModuleMock {
  const playImpact = jest.fn().mockResolvedValue(undefined);
  const playNotification = jest.fn().mockResolvedValue(undefined);
  const playSelection = jest.fn().mockResolvedValue(undefined);
  const playSuccessNotification = jest.fn().mockResolvedValue(undefined);
  const playErrorNotification = jest.fn().mockResolvedValue(undefined);
  const playWarningNotification = jest.fn().mockResolvedValue(undefined);

  const useHaptics = jest.fn(() => ({
    playSuccessNotification,
    playErrorNotification,
    playWarningNotification,
    playImpact,
    playNotification,
    playSelection,
  }));

  return {
    playImpact,
    playNotification,
    playSelection,
    playSuccessNotification,
    playErrorNotification,
    playWarningNotification,
    useHaptics,
    ImpactMoment,
    NotificationMoment,
    ...overrides,
  };
}
