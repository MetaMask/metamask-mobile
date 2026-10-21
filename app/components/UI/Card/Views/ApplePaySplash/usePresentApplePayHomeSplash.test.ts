import { act } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { initialState as cardInitialState } from '../../../../../core/redux/slices/card';
import Routes from '../../../../../constants/navigation/Routes';
import { setPushPrePromptActive } from '../../../../../util/notifications/pushPrePromptPresence';
import { usePresentApplePayHomeSplash } from './usePresentApplePayHomeSplash';
import type { ApplePayHomeEligibility } from './useApplePayHomeEligibility';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useIsFocused: () => true,
    useNavigation: () => ({
      navigate: mockNavigate,
      getParent: () => undefined,
    }),
  };
});

const splashEligibility: ApplePayHomeEligibility = {
  mode: 'provision',
  showSplash: true,
  showBanner: false,
  showRegionLine: false,
};

describe('usePresentApplePayHomeSplash', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setPushPrePromptActive(true);
  });

  it('waits to open the splash while the push pre-prompt is active', () => {
    renderHookWithProvider(
      () => usePresentApplePayHomeSplash(splashEligibility),
      { state: { card: cardInitialState } },
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the splash once the push pre-prompt closes', () => {
    renderHookWithProvider(
      () => usePresentApplePayHomeSplash(splashEligibility),
      { state: { card: cardInitialState } },
    );

    act(() => {
      setPushPrePromptActive(false);
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.APPLE_PAY_HOME_SPLASH,
      params: { source: 'home' },
    });
  });
});
