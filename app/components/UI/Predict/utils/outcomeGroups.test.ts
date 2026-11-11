import { PredictMarketStatus, type PredictOutcome } from '../types';
import { isResolvedOutcome } from './outcomeGroups';

const createOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome =>
  ({
    id: 'condition-1',
    status: PredictMarketStatus.OPEN,
    ...overrides,
  }) as PredictOutcome;

describe('isResolvedOutcome', () => {
  it('treats a Protocol V2 outcome with resolutionStatus "resolved" as resolved', () => {
    expect(
      isResolvedOutcome(
        createOutcome({ version: 'v2', resolutionStatus: 'resolved' }),
      ),
    ).toBe(true);
  });

  it.each(['active', 'inactive'])(
    'treats an open Protocol V2 outcome with resolutionStatus "%s" as unresolved',
    (resolutionStatus) => {
      expect(
        isResolvedOutcome(createOutcome({ version: 'v2', resolutionStatus })),
      ).toBe(false);
    },
  );

  it('treats a UMA outcome with status "resolved" as resolved', () => {
    expect(
      isResolvedOutcome(createOutcome({ resolutionStatus: 'resolved' })),
    ).toBe(true);
  });

  it('treats an open outcome without a resolution status as unresolved', () => {
    expect(isResolvedOutcome(createOutcome())).toBe(false);
  });

  it('treats a closed outcome as resolved', () => {
    expect(
      isResolvedOutcome(createOutcome({ status: PredictMarketStatus.CLOSED })),
    ).toBe(true);
  });
});
