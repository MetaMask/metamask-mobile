import Logger from '../../../../util/Logger';
import { predictAccountStateOptions } from './accountState';
import {
  PREDICT_NETWORK_ERROR_BREADCRUMB_MESSAGE,
  resetPredictNetworkErrorThrottle,
} from '../utils/predictNetworkError';

const mockGetAccountState = jest.fn();
const mockAddNetwork = jest.fn();
const mockEnableNetwork = jest.fn();
const mockNetworkConfigurationsByChainId: Record<string, object> = {};

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getAccountState: (...args: unknown[]) => mockGetAccountState(...args),
    },
    NetworkController: {
      get state() {
        return {
          networkConfigurationsByChainId: mockNetworkConfigurationsByChainId,
        };
      },
      addNetwork: (...args: unknown[]) => mockAddNetwork(...args),
    },
    NetworkEnablementController: {
      enableNetwork: (...args: unknown[]) => mockEnableNetwork(...args),
    },
  },
}));

const accountState = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  isDeployed: true,
  walletType: 'safe' as const,
};

/** Runs the query fn, which calls ensurePolygonNetwork before getAccountState. */
const runQueryFn = async () => {
  const { queryFn } = predictAccountStateOptions();
  if (typeof queryFn !== 'function') {
    throw new Error('predictAccountStateOptions did not provide a queryFn');
  }
  return await queryFn({} as Parameters<typeof queryFn>[0]);
};

describe('accountState query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPredictNetworkErrorThrottle();
    // Force ensurePolygonNetwork down the addNetwork branch.
    delete mockNetworkConfigurationsByChainId['0x89'];
    mockGetAccountState.mockResolvedValue(accountState);
  });

  it('records a network error from addNetwork as a breadcrumb instead of Logger.error', async () => {
    mockAddNetwork.mockRejectedValue(new Error('Network request failed'));

    await expect(runQueryFn()).resolves.toEqual(accountState);

    expect(Logger.error).not.toHaveBeenCalled();
    expect(Logger.log).toHaveBeenCalledTimes(1);
    expect(Logger.log).toHaveBeenCalledWith(
      PREDICT_NETWORK_ERROR_BREADCRUMB_MESSAGE,
      expect.any(String),
      expect.objectContaining({
        tags: expect.objectContaining({ component: 'ensurePolygonNetwork' }),
      }),
    );
  });

  it('reports a non-network error from addNetwork with Logger.error', async () => {
    mockAddNetwork.mockRejectedValue(new Error('Boom'));

    await expect(runQueryFn()).resolves.toEqual(accountState);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Boom' }),
      expect.objectContaining({
        tags: expect.objectContaining({ component: 'ensurePolygonNetwork' }),
      }),
    );
  });
});
