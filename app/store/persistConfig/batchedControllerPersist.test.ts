import FilesystemStorage from 'redux-persist-filesystem-storage';

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
  default: { isIos: jest.fn(() => true) },
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
    const mockSetItem = jest
      .mocked(FilesystemStorage.setItem)
      .mockResolvedValue(undefined);

    const { queueControllerPersist } = await import('./index');

    queueControllerPersist({ vault: 'a' }, 'KeyringController');
    queueControllerPersist({ chainId: '0x1' }, 'NetworkController');

    expect(mockSetItem).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSetItem).toHaveBeenCalledTimes(2);
    expect(mockSetItem).toHaveBeenCalledWith(
      'persist:KeyringController',
      JSON.stringify({ vault: 'a' }),
      true,
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      'persist:NetworkController',
      JSON.stringify({ chainId: '0x1' }),
      true,
    );
  });
});
