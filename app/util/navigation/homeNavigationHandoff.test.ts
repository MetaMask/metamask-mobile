import { act, renderHook } from '@testing-library/react-native';
import {
  beginHomeNavigationHandoff,
  useIsHomeNavigationPending,
} from './homeNavigationHandoff';
import mockRoutes from '../../constants/navigation/Routes';

let mockRouteKey = 'home';
const mockListeners = new Set<() => void>();
jest.mock('../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      getCurrentRoute: () => ({ key: mockRouteKey }),
      getRootState: () =>
        mockRouteKey === 'home'
          ? {
              routes: [
                {
                  name: mockRoutes.ONBOARDING.HOME_NAV,
                  state: {
                    routes: [
                      {
                        name: mockRoutes.HOME_TABS,
                        state: {
                          routes: [{ name: mockRoutes.WALLET.HOME }],
                          index: 0,
                        },
                      },
                    ],
                    index: 0,
                  },
                },
              ],
              index: 0,
            }
          : { routes: [{ name: mockRouteKey }], index: 0 },
      addListener: (_event: string, listener: () => void) => {
        mockListeners.add(listener);
        return () => mockListeners.delete(listener);
      },
    },
  },
}));

describe('home navigation handoff', () => {
  beforeEach(() => {
    mockRouteKey = 'home';
  });

  it('blocks home until a delayed action and destination commit both finish', async () => {
    const { result } = renderHook(useIsHomeNavigationPending);
    let finish: () => void = () => undefined;
    const action = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let run!: ReturnType<typeof beginHomeNavigationHandoff>;

    act(() => {
      run = beginHomeNavigationHandoff();
    });
    expect(result.current).toBe(true);
    const navigation = run.run(() => action);
    act(() => mockListeners.forEach((listener) => listener()));
    expect(result.current).toBe(true);

    await act(async () => {
      finish();
      await navigation;
    });
    expect(result.current).toBe(true);

    act(() => {
      mockRouteKey = 'destination';
      mockListeners.forEach((listener) => listener());
    });

    expect(result.current).toBe(false);
    expect(mockListeners.size).toBe(0);
  });

  it('releases when navigation commits before the action settles', async () => {
    const { result } = renderHook(useIsHomeNavigationPending);
    let finish: () => void = () => undefined;
    const action = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let running!: Promise<void>;

    act(() => {
      running = beginHomeNavigationHandoff().run(() => {
        mockRouteKey = 'destination';
        mockListeners.forEach((listener) => listener());
        return action;
      });
    });
    expect(result.current).toBe(true);
    await act(async () => {
      finish();
      await running;
    });

    expect(result.current).toBe(false);
    expect(mockListeners.size).toBe(0);
  });

  it('releases a cancelled action without waiting for navigation', async () => {
    const { result } = renderHook(useIsHomeNavigationPending);

    await act(async () => {
      await beginHomeNavigationHandoff().run(() => false);
    });

    expect(result.current).toBe(false);
    expect(mockListeners.size).toBe(0);
  });

  it('releases a failed action and propagates the failure', async () => {
    const { result } = renderHook(useIsHomeNavigationPending);

    await act(async () => {
      await expect(
        beginHomeNavigationHandoff().run(async () => {
          throw new Error('navigation failed');
        }),
      ).rejects.toThrow('navigation failed');
    });

    expect(result.current).toBe(false);
    expect(mockListeners.size).toBe(0);
  });

  it('releases a handoff cancelled before the exit animation completes', () => {
    const { result } = renderHook(useIsHomeNavigationPending);
    let handoff!: ReturnType<typeof beginHomeNavigationHandoff>;

    act(() => {
      handoff = beginHomeNavigationHandoff();
    });
    expect(result.current).toBe(true);
    act(() => {
      handoff.cancel();
    });

    expect(result.current).toBe(false);
  });
});
