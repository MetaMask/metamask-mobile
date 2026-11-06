import { renderHook } from '@testing-library/react-native';

import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../components/UI/Money/constants/moneyEvents';
import { useMoneyAnalytics } from '../components/UI/Money/hooks/useMoneyAnalytics';
import Routes from '../constants/navigation/Routes';
import { strings } from '../../locales/i18n';
import { useMetamaskOrangeEntry } from './useMetamaskOrangeEntry';
import { usePlusAccess } from './usePlusAccess';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

const mockNavigate = jest.fn();
const mockTrackButtonClicked = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('./useProSubscriptionEnabled', () => ({
  useProSubscriptionEnabled: jest.fn(() => ({
    isProSubscriptionEnabled: false,
  })),
}));

jest.mock('./usePlusAccess', () => ({
  usePlusAccess: jest.fn(() => ({
    isPlusSubscriber: false,
    isPlusAccessUnknown: false,
  })),
}));

jest.mock('../components/UI/Money/hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(() => ({
    trackButtonClicked: mockTrackButtonClicked,
  })),
}));

const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);
const mockUsePlusAccess = jest.mocked(usePlusAccess);
const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);

describe('useMetamaskOrangeEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
    });
    mockUsePlusAccess.mockReturnValue({
      isPlusSubscriber: false,
      isPlusAccessUnknown: false,
    });
    mockUseMoneyAnalytics.mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
  });

  it('stays hidden while the Orange flow is off', () => {
    const { result } = renderHook(() => useMetamaskOrangeEntry());

    expect(result.current.showOrangeEntry).toBe(false);
  });

  it('stays hidden while membership access is unresolved', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUsePlusAccess.mockReturnValue({
      isPlusSubscriber: false,
      isPlusAccessUnknown: true,
    });

    const { result } = renderHook(() => useMetamaskOrangeEntry());

    expect(result.current.showOrangeEntry).toBe(false);
  });

  it('invites a non-member to join and opens the subscription flow', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });

    const { result } = renderHook(() => useMetamaskOrangeEntry());

    result.current.onPress();

    expect(result.current.showOrangeEntry).toBe(true);
    expect(result.current.label).toBe(
      strings('accounts_menu.join_metamask_orange'),
    );
    expect(mockUseMoneyAnalytics).toHaveBeenCalledWith({
      screen_name: SCREEN_NAMES.ACCOUNTS_MENU,
    });
    expect(mockTrackButtonClicked).toHaveBeenCalledWith({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.GET_PRO,
      component_name: COMPONENT_NAMES.ACCOUNTS_MENU_ORANGE,
      label_key: 'accounts_menu.join_metamask_orange',
      redirect_target: SCREEN_NAMES.PRO_SUBSCRIPTION,
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_SUBSCRIPTION.ROOT, {
      source: 'accounts_menu',
    });
  });

  it('labels a member MetaMask Orange and opens the hub', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUsePlusAccess.mockReturnValue({
      isPlusSubscriber: true,
      isPlusAccessUnknown: false,
    });

    const { result } = renderHook(() => useMetamaskOrangeEntry());

    result.current.onPress();

    expect(result.current.label).toBe(strings('accounts_menu.metamask_orange'));
    expect(mockTrackButtonClicked).toHaveBeenCalledWith({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.OPEN_PRO_HUB,
      component_name: COMPONENT_NAMES.ACCOUNTS_MENU_ORANGE,
      label_key: 'accounts_menu.metamask_orange',
      redirect_target: SCREEN_NAMES.PRO_HUB,
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.ROOT, {
      source: 'accounts_menu',
    });
  });
});
