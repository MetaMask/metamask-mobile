import { renderHook } from '@testing-library/react-native';
import { TabActions } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { useFocusMoneyTabBelow } from './useFocusMoneyTabBelow';

const mockDispatch = jest.fn();
let mockStackState: unknown;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ dispatch: mockDispatch }),
  useNavigationState: (selector: (state: unknown) => unknown) =>
    selector(mockStackState),
}));

const stackWithTabs = (tabRouteNames: string[]) => ({
  index: 1,
  routes: [
    {
      name: Routes.HOME_TABS,
      state: { key: 'tabs-key', index: 0, routeNames: tabRouteNames },
    },
    { name: Routes.RAMP.VBA_ONBOARDING },
  ],
});

describe('useFocusMoneyTabBelow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('focuses the Money tab of the tabs navigator once that tab exists', () => {
    mockStackState = stackWithTabs([Routes.WALLET.HOME, Routes.MONEY.ROOT]);

    renderHook(() => useFocusMoneyTabBelow());

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      ...TabActions.jumpTo(Routes.MONEY.ROOT),
      target: 'tabs-key',
    });
  });

  it('waits until the Money tab appears', () => {
    mockStackState = stackWithTabs([Routes.WALLET.HOME]);
    const { rerender } = renderHook(() => useFocusMoneyTabBelow());
    expect(mockDispatch).not.toHaveBeenCalled();

    mockStackState = stackWithTabs([Routes.WALLET.HOME, Routes.MONEY.ROOT]);
    rerender({});

    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('focuses Money only once', () => {
    mockStackState = stackWithTabs([Routes.WALLET.HOME, Routes.MONEY.ROOT]);
    const { rerender } = renderHook(() => useFocusMoneyTabBelow());

    mockStackState = {
      ...stackWithTabs([Routes.WALLET.HOME, Routes.MONEY.ROOT]),
    };
    rerender({});

    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('does nothing before the tabs navigator has mounted', () => {
    mockStackState = {
      index: 1,
      routes: [
        { name: Routes.HOME_TABS },
        { name: Routes.RAMP.VBA_ONBOARDING },
      ],
    };

    renderHook(() => useFocusMoneyTabBelow());

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
