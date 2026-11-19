import { selectMoneySplashSeen } from '../../../../reducers/user/selectors';
import { selectMoneyAccountAccessBlockReason } from './visibility';
import {
  selectIsMoneySplashRedirectNeeded,
  selectMoneyEntryContext,
} from './entry';

jest.mock('../../../../reducers/user/selectors', () => ({
  selectMoneySplashSeen: jest.fn(),
}));

jest.mock('./visibility', () => ({
  selectMoneyAccountAccessBlockReason: jest.fn(),
}));

const mockSelectMoneySplashSeen = jest.mocked(selectMoneySplashSeen);
const mockSelectMoneyAccountAccessBlockReason = jest.mocked(
  selectMoneyAccountAccessBlockReason,
);

describe('selectIsMoneySplashRedirectNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    { hasSeenSplash: false, expectedRedirect: true },
    { hasSeenSplash: true, expectedRedirect: false },
  ])(
    'returns $expectedRedirect when hasSeenSplash is $hasSeenSplash',
    ({ hasSeenSplash, expectedRedirect }) => {
      mockSelectMoneySplashSeen.mockReturnValue(hasSeenSplash);

      const result = selectIsMoneySplashRedirectNeeded({} as never);

      expect(result).toBe(expectedRedirect);
    },
  );
});

describe('selectMoneyEntryContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectMoneySplashSeen.mockReturnValue(false);
    mockSelectMoneyAccountAccessBlockReason.mockReturnValue(undefined);
  });

  it('combines access policy and splash state', () => {
    mockSelectMoneyAccountAccessBlockReason.mockReturnValue('geo_blocked');

    const result = selectMoneyEntryContext({} as never);

    expect(result).toStrictEqual({
      accessBlockReason: 'geo_blocked',
      isSplashRedirectNeeded: true,
    });
  });

  it('returns the same context reference when selector inputs are unchanged', () => {
    const state = {} as never;

    const firstResult = selectMoneyEntryContext(state);
    const secondResult = selectMoneyEntryContext(state);

    expect(secondResult).toBe(firstResult);
  });
});
