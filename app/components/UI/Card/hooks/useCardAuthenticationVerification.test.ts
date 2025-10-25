import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardAuthenticationVerification } from './useCardAuthenticationVerification';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { verifyCardAuthentication } from '../../../../core/redux/slices/card';
import Logger from '../../../../util/Logger';
<<<<<<< HEAD
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';
=======
import { CardFeatureFlag } from '../../../../selectors/featureFlagController/card';
>>>>>>> 8ae259608f (feat: card delegation)

jest.mock('react-redux');
jest.mock('../../../hooks/useThunkDispatch');
jest.mock('../../../../core/redux/slices/card');
jest.mock('../../../../util/Logger');
<<<<<<< HEAD
jest.mock('./isBaanxLoginEnabled');
=======
>>>>>>> 8ae259608f (feat: card delegation)

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseThunkDispatch = useThunkDispatch as jest.MockedFunction<
  typeof useThunkDispatch
>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
<<<<<<< HEAD
const mockUseIsBaanxLoginEnabled =
  useIsBaanxLoginEnabled as jest.MockedFunction<typeof useIsBaanxLoginEnabled>;
=======
>>>>>>> 8ae259608f (feat: card delegation)

describe('useCardAuthenticationVerification', () => {
  const mockDispatch = jest.fn();

<<<<<<< HEAD
=======
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

>>>>>>> 8ae259608f (feat: card delegation)
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThunkDispatch.mockReturnValue(mockDispatch);
  });

<<<<<<< HEAD
  const setupMocks = (userLoggedIn: boolean, isBaanxLoginEnabled: boolean) => {
    mockUseSelector.mockReturnValue(userLoggedIn);
    mockUseIsBaanxLoginEnabled.mockReturnValue(isBaanxLoginEnabled);
  };

  it('dispatches verification when user is logged in and Baanx login is enabled', () => {
    setupMocks(true, true);
=======
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
>>>>>>> 8ae259608f (feat: card delegation)

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

<<<<<<< HEAD
  it('does not dispatch when user is logged in but Baanx login is disabled', () => {
    setupMocks(true, false);

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when user is not logged in', () => {
    setupMocks(false, true);
=======
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
>>>>>>> 8ae259608f (feat: card delegation)

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

<<<<<<< HEAD
  it('does not dispatch when user is not logged in and Baanx login is disabled', () => {
    setupMocks(false, false);
=======
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
>>>>>>> 8ae259608f (feat: card delegation)

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('logs error when dispatch throws Error instance', () => {
    const testError = new Error('Test dispatch error');
<<<<<<< HEAD
    setupMocks(true, true);
=======
    setupMockSelectors();
>>>>>>> 8ae259608f (feat: card delegation)
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
<<<<<<< HEAD
    setupMocks(true, true);
=======
    setupMockSelectors();
>>>>>>> 8ae259608f (feat: card delegation)
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
<<<<<<< HEAD
    setupMocks(false, true);
=======
    setupMockSelectors({ userLoggedIn: false });
>>>>>>> 8ae259608f (feat: card delegation)
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

<<<<<<< HEAD
    setupMocks(true, true);
=======
    setupMockSelectors({ userLoggedIn: true });
>>>>>>> 8ae259608f (feat: card delegation)
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

<<<<<<< HEAD
  it('dispatches verification when Baanx login becomes enabled', () => {
    setupMocks(true, false);
=======
  it('dispatches verification when card feature flag is enabled', () => {
    setupMockSelectors({ cardFeatureFlag: null });
>>>>>>> 8ae259608f (feat: card delegation)
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

<<<<<<< HEAD
    setupMocks(true, true);
=======
    setupMockSelectors({ cardFeatureFlag: mockCardFeatureFlag });
>>>>>>> 8ae259608f (feat: card delegation)
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

<<<<<<< HEAD
  it('dispatches verification again when isBaanxLoginEnabled flag changes from false to true', () => {
    setupMocks(true, false);
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

    setupMocks(true, true);
=======
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
>>>>>>> 8ae259608f (feat: card delegation)
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });
});
