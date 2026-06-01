import { selectBatchSellEnabled } from '.';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';

jest.mock('../../../constants/bridge', () => ({
  ...jest.requireActual('../../../constants/bridge'),
  BATCH_SELL_ENABLED: true,
}));

const mockedStateWithBatchSellEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          batchSell: { enabled: true },
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithBatchSellDisabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          batchSell: { enabled: false },
        },
        cacheTimestamp: 0,
      },
    },
  },
};

describe('selectBatchSellEnabled', () => {
  it('returns true when env and remote flag are enabled', () => {
    expect(selectBatchSellEnabled(mockedStateWithBatchSellEnabled)).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    expect(selectBatchSellEnabled(mockedStateWithBatchSellDisabled)).toBe(
      false,
    );
  });

  it('returns false when remote flag is missing', () => {
    expect(selectBatchSellEnabled(mockedEmptyFlagsState)).toBe(false);
  });

  it('returns false when controller state is undefined', () => {
    expect(selectBatchSellEnabled(mockedUndefinedFlagsState)).toBe(false);
  });
});
