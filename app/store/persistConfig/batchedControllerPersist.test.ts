jest.mock('redux-persist-filesystem-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../../util/Logger');
jest.mock('../../util/device', () => ({
  __esModule: true,
  default: {
    isIos: jest.fn(() => true),
    isAndroid: jest.fn(() => false),
  },
}));

jest.mock('redux-persist', () => ({
  createMigrate: () => () => Promise.resolve({}),
  createTransform: (
    inbound: unknown,
    outbound: unknown,
    config: { whitelist?: string[] },
  ) => ({
    in: inbound,
    out: outbound,
    whitelist: config.whitelist,
  }),
}));

jest.mock('../migrations', () => ({
  version: 1,
  migrations: { 1: (state: unknown) => state },
}));

jest.mock('../../core/Engine/constants', () => ({
  BACKGROUND_STATE_CHANGE_EVENT_NAMES: [],
}));

describe('batched controller persist', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('flushes multiple controller writes in one debounced batch', async () => {
    const { queueControllerPersist, ControllerStorage } = await import(
      './index'
    );
    const mockSetItem = jest
      .spyOn(ControllerStorage, 'setItem')
      .mockResolvedValue(undefined);

    queueControllerPersist({ vault: 'a' }, 'KeyringController');
    queueControllerPersist({ chainId: '0x1' }, 'NetworkController');

    expect(mockSetItem).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(200);

    expect(mockSetItem).toHaveBeenCalledTimes(2);
    expect(mockSetItem).toHaveBeenCalledWith(
      'persist:KeyringController',
      JSON.stringify({ vault: 'a' }),
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      'persist:NetworkController',
      JSON.stringify({ chainId: '0x1' }),
    );
  });
});
