import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardholderCheck } from './useCardholderCheck';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { loadCardholderAccounts } from '../../../../core/redux/slices/card';
import Logger from '../../../../util/Logger';
import { CardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { isEthAccount } from '../../../../core/Multichain/utils';

jest.mock('react-redux');
jest.mock('../../../hooks/useThunkDispatch');
jest.mock('../../../../core/redux/slices/card');
jest.mock('../../../../util/Logger');
jest.mock('../../../../core/Multichain/utils');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseThunkDispatch = useThunkDispatch as jest.MockedFunction<
  typeof useThunkDispatch
>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockIsEthAccount = isEthAccount as jest.MockedFunction<
  typeof isEthAccount
>;

describe('useCardholderCheck', () => {
  const mockDispatch = jest.fn();

  const mockCardFeatureFlag: CardFeatureFlag = {
    constants: {
      onRampApiUrl: 'https://api.onramp.metamask.io',
      accountsApiUrl: 'https://api.accounts.metamask.io',
    },
    chains: {
      '1': {
        enabled: true,
        tokens: [],
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThunkDispatch.mockReturnValue(mockDispatch);

    // Default mock for isEthAccount - returns true for EOA accounts
    mockIsEthAccount.mockImplementation(
      (account) => account.type === 'eip155:eoa',
    );
  });

  const defaultMockState = {
    userLoggedIn: true,
    appServicesReady: true,
    cardFeatureFlag: mockCardFeatureFlag,
    accounts: [
      {
        type: 'eip155:eoa',
        caipAccountId: 'eip155:1:0x123',
      },
      {
        type: 'eip155:eoa',
        caipAccountId: 'eip155:1:0x456',
      },
    ],
  };

  const setupMockSelectors = (overrides = {}) => {
    const state = { ...defaultMockState, ...overrides };

    mockUseSelector.mockReset();

    // Create a closure to maintain state across calls
    const selectorValues = [
      state.userLoggedIn,
      state.appServicesReady,
      state.cardFeatureFlag,
      state.accounts,
    ];

    let callIndex = 0;
    mockUseSelector.mockImplementation(() => {
      const value = selectorValues[callIndex % selectorValues.length];
      callIndex++;
      return value;
    });
  };
  it('should dispatch loadCardholderAccounts when all conditions are met', () => {
    setupMockSelectors();

    renderHook(() => useCardholderCheck());

    expect(mockDispatch).toHaveBeenCalledWith(
      loadCardholderAccounts({
        caipAccountIds: ['eip155:1:0x123', 'eip155:1:0x456'],
        cardFeatureFlag: mockCardFeatureFlag,
      }),
    );
  });

  it('should not dispatch when user is not logged in', () => {
    setupMockSelectors({ userLoggedIn: false });

    renderHook(() => useCardholderCheck());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch when app services are not ready', () => {
    setupMockSelectors({ appServicesReady: false });

    renderHook(() => useCardholderCheck());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch when card feature flag is disabled', () => {
    setupMockSelectors({ cardFeatureFlag: null });

    renderHook(() => useCardholderCheck());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch when no accounts are available', () => {
    setupMockSelectors({ accounts: [] });

    renderHook(() => useCardholderCheck());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should filter out non-EOA accounts', () => {
    const accountsWithNonEOA = [
      {
        type: 'eip155:eoa',
        caipAccountId: 'eip155:1:0x123',
      },
      {
        type: 'eip155:erc4337',
        caipAccountId: 'eip155:1:0x456',
      },
      {
        type: 'eip155:eoa',
        caipAccountId: 'eip155:1:0x789',
      },
    ];

    setupMockSelectors({ accounts: accountsWithNonEOA });

    renderHook(() => useCardholderCheck());

    expect(mockDispatch).toHaveBeenCalledWith(
      loadCardholderAccounts({
        caipAccountIds: ['eip155:1:0x123', 'eip155:1:0x789'],
        cardFeatureFlag: mockCardFeatureFlag,
      }),
    );
  });

  it('should not dispatch when no EOA accounts are available', () => {
    const accountsWithoutEOA = [
      {
        type: 'eip155:erc4337',
        caipAccountId: 'eip155:1:0x123',
      },
      {
        type: 'eip155:erc4337',
        caipAccountId: 'eip155:1:0x456',
      },
    ];

    setupMockSelectors({ accounts: accountsWithoutEOA });

    renderHook(() => useCardholderCheck());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should handle errors and log them', () => {
    setupMockSelectors();
    const error = new Error('Test error');
    mockDispatch.mockImplementation(() => {
      throw error;
    });

    renderHook(() => useCardholderCheck());

    expect(mockLogger.error).toHaveBeenCalledWith(
      error,
      'useCardholderCheck::Error checking cardholder accounts',
    );
  });

  it('should handle non-Error objects and log them', () => {
    setupMockSelectors();
    const errorMessage = 'String error';
    mockDispatch.mockImplementation(() => {
      throw errorMessage;
    });

    renderHook(() => useCardholderCheck());

    expect(mockLogger.error).toHaveBeenCalledWith(
      new Error(errorMessage),
      'useCardholderCheck::Error checking cardholder accounts',
    );
  });

  it('should re-run effect when dependencies change', () => {
    // First render
    setupMockSelectors();
    const { rerender } = renderHook(() => useCardholderCheck());

    expect(mockDispatch).toHaveBeenCalledTimes(1);

    // Second render with same values - should not dispatch again
    // No need to call setupMockSelectors again as the values haven't changed
    rerender();

    expect(mockDispatch).toHaveBeenCalledTimes(1);

    // Third render with different accounts - should dispatch again
    const newAccounts = [
      {
        type: 'eip155:eoa',
        caipAccountId: 'eip155:1:0x999',
      },
    ];
    setupMockSelectors({ accounts: newAccounts });
    rerender();

    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenLastCalledWith(
      loadCardholderAccounts({
        caipAccountIds: ['eip155:1:0x999'],
        cardFeatureFlag: mockCardFeatureFlag,
      }),
    );
  });

  it('should handle empty accounts array', () => {
    setupMockSelectors({ accounts: [] });

    renderHook(() => useCardholderCheck());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should handle undefined accounts', () => {
    setupMockSelectors({ accounts: undefined });

    renderHook(() => useCardholderCheck());

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
