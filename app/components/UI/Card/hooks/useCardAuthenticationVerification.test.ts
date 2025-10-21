import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardAuthenticationVerification } from './useCardAuthenticationVerification';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { verifyCardAuthentication } from '../../../../core/redux/slices/card';
import Logger from '../../../../util/Logger';
import { CardFeatureFlag } from '../../../../selectors/featureFlagController/card';

jest.mock('react-redux');
jest.mock('../../../hooks/useThunkDispatch');
jest.mock('../../../../core/redux/slices/card');
jest.mock('../../../../util/Logger');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseThunkDispatch = useThunkDispatch as jest.MockedFunction<
  typeof useThunkDispatch
>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('useCardAuthenticationVerification', () => {
  const mockDispatch = jest.fn();

  const mockCardFeatureFlag: CardFeatureFlag = {
    isBaanxLoginEnabled: true,
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
  });

  const defaultMockState = {
    userLoggedIn: true,
    cardFeatureFlag: mockCardFeatureFlag,
  };

  const setupMockSelectors = (overrides = {}) => {
    const state = { ...defaultMockState, ...overrides };

    mockUseSelector.mockReset();

    const selectorValues = [state.userLoggedIn, state.cardFeatureFlag];

    let callIndex = 0;
    mockUseSelector.mockImplementation(() => {
      const value = selectorValues[callIndex % selectorValues.length];
      callIndex++;
      return value;
    });
  };

  it('dispatches verification when all conditions are met', () => {
    setupMockSelectors();

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

  it('dispatches verification with isBaanxLoginEnabled false', () => {
    setupMockSelectors({
      cardFeatureFlag: { ...mockCardFeatureFlag, isBaanxLoginEnabled: false },
    });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: false,
      }),
    );
  });

  it('dispatches verification when isBaanxLoginEnabled is undefined', () => {
    const featureFlagWithoutBaanx = { ...mockCardFeatureFlag };
    delete (featureFlagWithoutBaanx as Partial<CardFeatureFlag>)
      .isBaanxLoginEnabled;
    setupMockSelectors({
      cardFeatureFlag: featureFlagWithoutBaanx,
    });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: false,
      }),
    );
  });

  it('does not dispatch when user is not logged in', () => {
    setupMockSelectors({ userLoggedIn: false });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when card feature flag is null', () => {
    setupMockSelectors({ cardFeatureFlag: null });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when card feature flag is undefined', () => {
    setupMockSelectors({ cardFeatureFlag: undefined });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when both user is not logged in and card feature flag is not enabled', () => {
    setupMockSelectors({ userLoggedIn: false, cardFeatureFlag: null });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('logs error when dispatch throws Error instance', () => {
    const testError = new Error('Test dispatch error');
    setupMockSelectors();
    mockDispatch.mockImplementation(() => {
      throw testError;
    });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockLogger.error).toHaveBeenCalledWith(
      testError,
      'useCardAuthenticationVerification::Error verifying authentication',
    );
  });

  it('logs error when dispatch throws non-Error value', () => {
    setupMockSelectors();
    mockDispatch.mockImplementation(() => {
      throw 'String error';
    });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockLogger.error).toHaveBeenCalledWith(
      new Error('String error'),
      'useCardAuthenticationVerification::Error verifying authentication',
    );
  });

  it('dispatches verification when user logs in', () => {
    setupMockSelectors({ userLoggedIn: false });
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

    setupMockSelectors({ userLoggedIn: true });
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

  it('dispatches verification when card feature flag is enabled', () => {
    setupMockSelectors({ cardFeatureFlag: null });
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

    setupMockSelectors({ cardFeatureFlag: mockCardFeatureFlag });
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

  it('dispatches verification again when isBaanxLoginEnabled flag changes', () => {
    setupMockSelectors({
      cardFeatureFlag: { ...mockCardFeatureFlag, isBaanxLoginEnabled: false },
    });
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: false,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledTimes(1);

    mockDispatch.mockClear();

    setupMockSelectors({
      cardFeatureFlag: { ...mockCardFeatureFlag, isBaanxLoginEnabled: true },
    });
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });
});
