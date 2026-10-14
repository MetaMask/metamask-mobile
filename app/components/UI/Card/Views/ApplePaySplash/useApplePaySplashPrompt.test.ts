import { act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  initialState as cardInitialState,
  setApplePaySplashSeen,
} from '../../../../../core/redux/slices/card';
import { useApplePaySplashPrompt } from './useApplePaySplashPrompt';

const mockNavigate = jest.fn();
let focusEffect: (() => void) | undefined;
let blurListener: (() => void) | undefined;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      addListener: (event: string, listener: () => void) => {
        if (event === 'blur') {
          blurListener = listener;
        }
        return jest.fn();
      },
    }),
    useFocusEffect: (effect: () => void) => {
      focusEffect = effect;
    },
  };
});

jest.mock('../../hooks/useCardCapabilities', () => ({
  useCardCapabilities: () => ({
    pushProvisioning: { applePay: true },
  }),
}));

jest.mock('../../../../../selectors/cardController', () => ({
  selectIsCardAuthenticated: () => true,
  selectCardActiveProviderId: () => 'immersve',
}));

jest.mock('../../../../../selectors/featureFlagController/card', () => ({
  selectPushProvisioningEnabled: () => true,
}));

const readyEligibility = {
  canAddToWallet: true,
  isPushProvisioningLoading: false,
};

describe('useApplePaySplashPrompt', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    Platform.OS = 'ios';
    mockNavigate.mockClear();
    focusEffect = undefined;
    blurListener = undefined;
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  it('does not reopen when Card Home regains focus after a reset on the splash', () => {
    const { store } = renderHookWithProvider(
      () => useApplePaySplashPrompt(readyEligibility),
      {
        state: { card: cardInitialState },
      },
    );

    act(() => {
      focusEffect?.();
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    act(() => {
      store.dispatch(setApplePaySplashSeen(false));
      blurListener?.();
      focusEffect?.();
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('shows again on the next Card Home visit after leaving', () => {
    const { store } = renderHookWithProvider(
      () => useApplePaySplashPrompt(readyEligibility),
      {
        state: { card: cardInitialState },
      },
    );

    act(() => {
      focusEffect?.();
      blurListener?.();
    });
    act(() => {
      store.dispatch(setApplePaySplashSeen(false));
      focusEffect?.();
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    act(() => {
      blurListener?.();
      focusEffect?.();
    });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it('waits until the card can be added to Apple Wallet', () => {
    const eligibility = {
      canAddToWallet: false,
      isPushProvisioningLoading: true,
    };
    const { rerender } = renderHookWithProvider(
      () => useApplePaySplashPrompt(eligibility),
      { state: { card: cardInitialState } },
    );

    act(() => {
      focusEffect?.();
    });
    expect(mockNavigate).not.toHaveBeenCalled();

    eligibility.isPushProvisioningLoading = false;
    eligibility.canAddToWallet = true;
    rerender(undefined);

    act(() => {
      focusEffect?.();
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
