import {
  captureView,
  focusedChain,
  registerFoxyNavigation,
} from './FoxyView';

const rootState = {
  index: 0,
  routes: [
    {
      name: 'Main',
      key: 'main-1',
      state: {
        index: 1,
        routes: [
          { name: 'WalletTabHome', key: 'a' },
          {
            name: 'SwapsAmountView',
            key: 'swap-1',
            params: { sourceToken: '0xabc', chainId: '0x1', screen: 'x' },
          },
        ],
      },
    },
  ],
};

describe('focusedChain', () => {
  it('follows the focused route through nested navigators', () => {
    const { path, leaf } = focusedChain(rootState);

    expect(path).toEqual(['Main', 'SwapsAmountView']);
    expect(leaf?.key).toBe('swap-1');
  });

  it('returns an empty chain when there is no state', () => {
    expect(focusedChain(undefined)).toEqual({ path: [], leaf: undefined });
  });
});

describe('captureView', () => {
  it('reports navigation as not ready until a container is registered', () => {
    expect(captureView()).toMatchObject({
      route: null,
      path: [],
      ready: false,
    });
  });

  it('reports the focused screen with param names only, never values', () => {
    registerFoxyNavigation({
      isReady: () => true,
      getRootState: () => rootState,
      addListener: jest.fn(),
    });

    const view = captureView();

    expect(view).toMatchObject({
      route: 'SwapsAmountView',
      path: ['Main', 'SwapsAmountView'],
      params: ['sourceToken', 'chainId'],
      ready: true,
    });
    expect(JSON.stringify(view)).not.toContain('0xabc');
    expect(view.screenAgeMs).toBeGreaterThanOrEqual(0);
  });

  it('restarts the time on screen when the focused screen changes', () => {
    let state: Parameters<typeof focusedChain>[0] = rootState;
    let onState: () => void = () => undefined;
    registerFoxyNavigation({
      isReady: () => true,
      getRootState: () => state,
      addListener: (_event, cb) => {
        onState = cb;
      },
    });
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(10_000);
    state = { index: 0, routes: [{ name: 'Settings', key: 'settings-1' }] };
    onState();
    nowSpy.mockReturnValue(10_450);

    expect(captureView()).toMatchObject({
      route: 'Settings',
      screenAgeMs: 450,
    });
    nowSpy.mockRestore();
  });
});
