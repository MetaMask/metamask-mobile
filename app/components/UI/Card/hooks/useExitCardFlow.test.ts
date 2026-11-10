import { act, renderHook } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { useExitCardFlow } from './useExitCardFlow';

interface TestRoute {
  name: string;
  params?: { returnToCaller?: boolean };
}

interface TestNavigation {
  navigate: jest.Mock;
  goBack: jest.Mock;
  canGoBack: jest.Mock;
  getParent: () => TestNavigation | undefined;
  getState: () => { index: number; routes: TestRoute[] };
}

const mockNavigate = jest.fn();
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
}: {
  routeName: string;
  params?: { returnToCaller?: boolean };
  index?: number;
  canGoBack?: boolean;
  parent?: TestNavigation;
}): TestNavigation => ({
  navigate: mockNavigate,
  goBack: jest.fn(),
  canGoBack: jest.fn(() => canGoBack),
  getParent: () => parent,
  getState: () => ({
    index,
    routes: [
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
});
