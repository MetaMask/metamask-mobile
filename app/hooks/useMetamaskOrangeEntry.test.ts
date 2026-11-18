import { renderHook } from '@testing-library/react-native';

import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../components/UI/Money/constants/moneyEvents';
import { useMoneyAnalytics } from '../components/UI/Money/hooks/useMoneyAnalytics';
import { selectMoneyAccountAccessBlockReason } from '../components/UI/Money/selectors/visibility';
import Routes from '../constants/navigation/Routes';
import { strings } from '../../locales/i18n';
import useSubscriptions from '../components/hooks/useSubscriptions';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccessState,
} from './useMoneyAccountPlusAccess';
import { useHasProMembership } from './useHasProMembership';
import { useMetamaskOrangeEntry } from './useMetamaskOrangeEntry';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

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

jest.mock('./useHasProMembership', () => ({
  useHasProMembership: jest.fn(() => false),
}));

jest.mock('./useMoneyAccountPlusAccess', () => ({
  ...jest.requireActual('./useMoneyAccountPlusAccess'),
  useMoneyAccountPlusAccessState: jest.fn(() => ({
    access: 'eligible',
    isSubscriptionsSettled: true,
  })),
}));

jest.mock('../components/hooks/useSubscriptions', () => jest.fn());

jest.mock('../components/UI/Money/hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(() => ({
    trackButtonClicked: mockTrackButtonClicked,
  })),
}));

const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);
const mockUseHasProMembership = jest.mocked(useHasProMembership);
const mockUseMoneyAccountPlusAccessState = jest.mocked(
  useMoneyAccountPlusAccessState,
);
const mockUseSubscriptions = jest.mocked(useSubscriptions);
const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);

describe('useMetamaskOrangeEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(undefined);
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
    });
    mockUseHasProMembership.mockReturnValue(false);
    mockUseMoneyAccountPlusAccessState.mockReturnValue({
      access: MoneyAccountPlusAccess.Eligible,
      isSubscriptionsSettled: true,
    });
    mockUseMoneyAnalytics.mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
  });

  it('stays hidden while the Orange flow is off', () => {
    const { result } = renderHook(() => useMetamaskOrangeEntry());

    expect(result.current.showOrangeEntry).toBe(false);
  });

  it('hides the row while an eligible refetch is still running', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUseHasProMembership.mockReturnValue(false);
    mockUseMoneyAccountPlusAccessState.mockReturnValue({
      access: MoneyAccountPlusAccess.Eligible,
      isSubscriptionsSettled: false,
    });

    const { result } = renderHook(() => useMetamaskOrangeEntry());

    result.current.onPress();

    expect(result.current.showOrangeEntry).toBe(false);
    expect(mockTrackButtonClicked).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('hides the row while membership is still loading', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUseHasProMembership.mockReturnValue(false);
    mockUseMoneyAccountPlusAccessState.mockReturnValue({
      access: MoneyAccountPlusAccess.Unknown,
      isSubscriptionsSettled: false,
    });

    const { result } = renderHook(() => useMetamaskOrangeEntry());

    result.current.onPress();

    expect(result.current.showOrangeEntry).toBe(false);
    expect(mockTrackButtonClicked).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('hides the row while an entitlement is still loading', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUseHasProMembership.mockReturnValue(false);
    mockUseMoneyAccountPlusAccessState.mockReturnValue({
      access: MoneyAccountPlusAccess.Subscriber,
      isSubscriptionsSettled: false,
    });

    const { result } = renderHook(() => useMetamaskOrangeEntry());

    result.current.onPress();

    expect(result.current.showOrangeEntry).toBe(false);
    expect(mockTrackButtonClicked).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a stored member before subscriptions settle', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUseHasProMembership.mockReturnValue(true);
    mockUseMoneyAccountPlusAccessState.mockReturnValue({
      access: MoneyAccountPlusAccess.Unknown,
      isSubscriptionsSettled: false,
    });

    const { result } = renderHook(() => useMetamaskOrangeEntry());

    result.current.onPress();

    expect(result.current.showOrangeEntry).toBe(true);
    expect(result.current.label).toBe(strings('accounts_menu.metamask_orange'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.ROOT, {
      source: 'accounts_menu',
    });
  });

  it('invites a settled entitlement-only user to join and opens Benefits', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUseHasProMembership.mockReturnValue(false);
    mockUseMoneyAccountPlusAccessState.mockReturnValue({
      access: MoneyAccountPlusAccess.Subscriber,
      isSubscriptionsSettled: true,
    });

    const { result } = renderHook(() => useMetamaskOrangeEntry());

    result.current.onPress();

    expect(result.current.showOrangeEntry).toBe(true);
    expect(result.current.label).toBe(
      strings('accounts_menu.join_metamask_orange'),
    );
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

  it('fetches subscriptions when Money Account access is blocked', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUseSelector.mockImplementation((selector: unknown) =>
      selector === selectMoneyAccountAccessBlockReason
        ? 'geo_blocked'
        : undefined,
    );

    renderHook(() => useMetamaskOrangeEntry());

    expect(mockUseSubscriptions).toHaveBeenCalledWith({ enabled: true });
  });

  it('leaves the subscriptions fetch off when Money Account access is open', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });

    renderHook(() => useMetamaskOrangeEntry());

    expect(mockUseSubscriptions).toHaveBeenCalledWith({ enabled: false });
  });

  it('hides the join row when the country is geo-blocked', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUseSelector.mockImplementation((selector: unknown) =>
      selector === selectMoneyAccountAccessBlockReason
        ? 'geo_blocked'
        : undefined,
    );

    const { result } = renderHook(() => useMetamaskOrangeEntry());

    expect(result.current.showOrangeEntry).toBe(false);
  });

  it('hides the join row when Money Account is turned off', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUseSelector.mockImplementation((selector: unknown) =>
      selector === selectMoneyAccountAccessBlockReason
        ? 'feature_disabled'
        : undefined,
    );

    const { result } = renderHook(() => useMetamaskOrangeEntry());

    expect(result.current.showOrangeEntry).toBe(false);
    expect(mockUseSubscriptions).toHaveBeenCalledWith({ enabled: true });
  });

  it('opens Pro Hub for a member in a blocked country', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUseHasProMembership.mockReturnValue(true);
    mockUseSelector.mockImplementation((selector: unknown) =>
      selector === selectMoneyAccountAccessBlockReason
        ? 'geo_blocked'
        : undefined,
    );

    const { result } = renderHook(() => useMetamaskOrangeEntry());

    result.current.onPress();

    expect(result.current.showOrangeEntry).toBe(true);
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

  it('labels a member MetaMask Orange and opens the hub', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });
    mockUseHasProMembership.mockReturnValue(true);
    mockUseMoneyAccountPlusAccessState.mockReturnValue({
      access: MoneyAccountPlusAccess.Subscriber,
      isSubscriptionsSettled: true,
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
