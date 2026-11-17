import { act, renderHook } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import {
  CASHBACK_MONEY_ACCOUNT_ORIGIN,
  MONEY_HOME_CARD_ORIGIN,
} from './useCardPostAuthRedirect';
import { useExitCardFlow } from './useExitCardFlow';

interface TestRoute {
  name: string;
  params?: {
    returnToCaller?: boolean;
    postAuthRedirect?: object;
  };
}

interface TestNavigation {
  navigate: jest.Mock;
  reset: jest.Mock;
  goBack: jest.Mock;
  canGoBack: jest.Mock;
  getParent: () => TestNavigation | undefined;
  getState: () => { index: number; routes: TestRoute[] };
}

const mockNavigate = jest.fn();
const mockReset = jest.fn();
let mockScreenNavigation: TestNavigation;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockScreenNavigation,
}));

const createNavigation = ({
  routeName,
  params,
  index = 0,
  canGoBack = true,
  parent,
  routes,
}: {
  routeName: string;
  params?: TestRoute['params'];
  index?: number;
  canGoBack?: boolean;
  parent?: TestNavigation;
  routes?: TestRoute[];
}): TestNavigation => ({
  navigate: mockNavigate,
  reset: mockReset,
  goBack: jest.fn(),
  canGoBack: jest.fn(() => canGoBack),
  getParent: () => parent,
  getState: () => ({
    index,
    routes: routes ?? [
      ...Array.from({ length: index }, () => ({ name: 'Previous' })),
      { name: routeName, params },
    ],
  }),
});

describe('useExitCardFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pops the Card root when the caller asked to return', () => {
    const cardRoot = createNavigation({
      routeName: Routes.CARD.ROOT,
      params: { returnToCaller: true },
      index: 1,
    });
    const onboarding = createNavigation({
      routeName: Routes.CARD.ONBOARDING.ROOT,
      parent: cardRoot,
    });
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
      parent: onboarding,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current();
    });

    expect(cardRoot.goBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to wallet home when Card root has no return marker', () => {
    const cardRoot = createNavigation({
      routeName: Routes.CARD.ROOT,
      index: 1,
    });
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
      parent: cardRoot,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current();
    });

    expect(cardRoot.goBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('navigates to wallet home when no Card root is in the parent chain', () => {
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current();
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('resets to Card home when the pending fallback has no opener', () => {
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current({ fallback: 'card-home-pending' });
    });

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.HOME, params: { fromKycPending: true } }],
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('returns to the opener instead of the pending fallback', () => {
    const cardRoot = createNavigation({
      routeName: Routes.CARD.ROOT,
      params: { returnToCaller: true },
      index: 1,
    });
    const onboarding = createNavigation({
      routeName: Routes.CARD.ONBOARDING.ROOT,
      parent: cardRoot,
    });
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
      parent: onboarding,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current({ fallback: 'card-home-pending' });
    });

    expect(cardRoot.goBack).toHaveBeenCalledTimes(1);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('navigates to wallet home when the Card root cannot go back', () => {
    const cardRoot = createNavigation({
      routeName: Routes.CARD.ROOT,
      params: { returnToCaller: true },
      index: 1,
      canGoBack: false,
    });
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
      parent: cardRoot,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current();
    });

    expect(cardRoot.goBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('navigates to wallet home when Card root is the first route', () => {
    const cardRoot = createNavigation({
      routeName: Routes.CARD.ROOT,
      params: { returnToCaller: true },
      index: 0,
      canGoBack: true,
    });
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
      parent: cardRoot,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current();
    });

    expect(cardRoot.goBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('pops the setup navigator when it sits on Card home', () => {
    const screens = createNavigation({
      routeName: Routes.CARD.ONBOARDING.ROOT,
      index: 1,
      routes: [
        { name: Routes.CARD.HOME },
        { name: Routes.CARD.ONBOARDING.ROOT },
      ],
    });
    const onboarding = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
      parent: screens,
    });
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.IMMERSVE_KYC,
      parent: onboarding,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current();
    });

    expect(screens.goBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('pops the setup navigator instead of the Card root when setup sits on Card home', () => {
    const cardRoot = createNavigation({
      routeName: Routes.CARD.ROOT,
      params: { returnToCaller: true },
      index: 1,
    });
    const screens = createNavigation({
      routeName: Routes.CARD.ONBOARDING.ROOT,
      index: 1,
      parent: cardRoot,
      routes: [
        { name: Routes.CARD.HOME },
        {
          name: Routes.CARD.ONBOARDING.ROOT,
          params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
        },
      ],
    });
    const onboarding = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
      parent: screens,
    });
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.IMMERSVE_KYC,
      parent: onboarding,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current();
    });

    expect(screens.goBack).toHaveBeenCalledTimes(1);
    expect(cardRoot.goBack).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('pops the Card root when the flow started from Money home', () => {
    const cardRoot = createNavigation({
      routeName: Routes.CARD.ROOT,
      index: 1,
    });
    const screens = createNavigation({
      routeName: Routes.CARD.ONBOARDING.ROOT,
      params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
      parent: cardRoot,
    });
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
      parent: screens,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current();
    });

    expect(cardRoot.goBack).toHaveBeenCalledTimes(1);
    expect(screens.goBack).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to wallet home when a Money home flow cannot pop the Card root', () => {
    const cardRoot = createNavigation({
      routeName: Routes.CARD.ROOT,
      index: 1,
      canGoBack: false,
    });
    const screens = createNavigation({
      routeName: Routes.CARD.ONBOARDING.ROOT,
      params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
      parent: cardRoot,
    });
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
      parent: screens,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current();
    });

    expect(cardRoot.goBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it.each([Routes.CARD.WELCOME, Routes.CARD.AUTHENTICATION])(
    'navigates to wallet home when setup sits on %s',
    (underlyingRoute) => {
      const cardRoot = createNavigation({
        routeName: Routes.CARD.ROOT,
        index: 1,
      });
      const screens = createNavigation({
        routeName: Routes.CARD.ONBOARDING.ROOT,
        index: 1,
        parent: cardRoot,
        routes: [
          { name: underlyingRoute },
          { name: Routes.CARD.ONBOARDING.ROOT },
        ],
      });
      const onboarding = createNavigation({
        routeName: Routes.CARD.ONBOARDING.SIGN_UP,
        parent: screens,
      });
      mockScreenNavigation = createNavigation({
        routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
        parent: onboarding,
      });

      const { result } = renderHook(() => useExitCardFlow());

      act(() => {
        result.current();
      });

      expect(screens.goBack).not.toHaveBeenCalled();
      expect(cardRoot.goBack).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    },
  );

  it('navigates to wallet home when the flow started from Cashback', () => {
    const cardRoot = createNavigation({
      routeName: Routes.CARD.ROOT,
      index: 1,
    });
    const screens = createNavigation({
      routeName: Routes.CARD.ONBOARDING.ROOT,
      params: { postAuthRedirect: CASHBACK_MONEY_ACCOUNT_ORIGIN },
      parent: cardRoot,
    });
    mockScreenNavigation = createNavigation({
      routeName: Routes.CARD.ONBOARDING.KYC_PROCESSING,
      parent: screens,
    });

    const { result } = renderHook(() => useExitCardFlow());

    act(() => {
      result.current();
    });

    expect(cardRoot.goBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });
});
