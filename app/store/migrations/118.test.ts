import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import migrate from './118';
import { BridgeStatusControllerState } from '@metamask/bridge-status-controller';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const makeHistoryItem = () => ({
  quote: {
    srcChainId: 1,
    destChainId: 10,
  },
  status: {
    status: 'PENDING',
    srcChain: {
      chainId: 1,
      txHash: '0xhash',
    },
  },
  estimatedProcessingTimeInSeconds: 1,
  slippagePercentage: 0,
  account: '0xaccount',
  hasApprovalTx: false,
});

describe('Migration 118: Re-key intent txHistory items', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('rekeys intent-prefixed txHistory items and preserves non-intent keys', () => {
    const historyItem = makeHistoryItem();
    const otherItem = makeHistoryItem();

    const oldState = {
      engine: {
        backgroundState: {
          BridgeStatusController: {
            txHistory: {
              'intent:order-1': historyItem,
              'order-2': otherItem,
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const newState = migrate(oldState) as {
      engine: {
        backgroundState: {
          BridgeStatusController: BridgeStatusControllerState;
        };
      };
    };

    expect(
      newState.engine.backgroundState.BridgeStatusController.txHistory,
    ).toStrictEqual({
      'order-1': historyItem,
      'order-2': otherItem,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes the intent-prefixed key when the new key already exists', () => {
    const existingItem = makeHistoryItem();
    const intentItem = {
      ...makeHistoryItem(),
      account: '0xintent',
      status: {
        status: 'PENDING',
        srcChain: {
          chainId: 1,
          txHash: '0xintenthash',
        },
      },
    };

    const oldState = {
      engine: {
        backgroundState: {
          BridgeStatusController: {
            txHistory: {
              'order-1': existingItem,
              'intent:order-1': intentItem,
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const newState = migrate(oldState) as {
      engine: {
        backgroundState: {
          BridgeStatusController: BridgeStatusControllerState;
        };
      };
    };

    expect(
      newState.engine.backgroundState.BridgeStatusController.txHistory,
    ).toStrictEqual({
      'order-1': existingItem,
    });
  });

  it('returns state unchanged when BridgeStatusController state is invalid', () => {
    mockedEnsureValidState.mockReturnValue(true);

    const oldState = {
      engine: {
        backgroundState: {
          BridgeStatusController: {
            txHistory: 'not-an-object',
          },
        },
      },
    };

    const newState = migrate(oldState);

    expect(newState).toStrictEqual(oldState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
