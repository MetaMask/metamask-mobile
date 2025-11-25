import SharedDeeplinkManager from './SharedDeeplinkManager';
import DeeplinkManager from './DeeplinkManager';
import { store } from '../../store';
import { RootState } from '../../reducers';

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

describe('SharedDeeplinkManager', () => {
  const mockStore = store as jest.Mocked<typeof store>;

  beforeEach(() => {
    const mockedState = {
      settings: { deepLinkModalDisabled: false },
    } as jest.Mocked<RootState>;

    mockStore.getState.mockReturnValue(mockedState);

    SharedDeeplinkManager.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return instance of DeeplinkManager when calling getInstance', () => {
    const instance = SharedDeeplinkManager.getInstance();

    expect(instance).toBeDefined();
    expect(instance).toBeInstanceOf(DeeplinkManager);
  });

  it('should call parse method on the DeeplinkManager instance after initialization', () => {
    const instance = SharedDeeplinkManager.getInstance();
    const spyParse = jest.spyOn(instance, 'parse');

    const url = 'http://example.com';
    const args = {
      browserCallBack: jest.fn(),
      origin: 'test-origin',
      onHandled: jest.fn(),
    };

    SharedDeeplinkManager.parse(url, args);

    expect(spyParse).toHaveBeenCalledWith(url, args);
  });

  it('should call setDeeplink method on the DeeplinkManager instance after initialization', () => {
    const instance = SharedDeeplinkManager.getInstance();
    const spySetDeeplink = jest.spyOn(instance, 'setDeeplink');

    const url = 'http://example.com';
    SharedDeeplinkManager.setDeeplink(url);

    expect(spySetDeeplink).toHaveBeenCalledWith(url);
  });

  it('should call getPendingDeeplink method on the DeeplinkManager instance after initialization', () => {
    const instance = SharedDeeplinkManager.getInstance();
    const spyGetPendingDeeplink = jest.spyOn(instance, 'getPendingDeeplink');

    SharedDeeplinkManager.getPendingDeeplink();

    expect(spyGetPendingDeeplink).toHaveBeenCalled();
  });

  it('should call expireDeeplink method on the DeeplinkManager instance after initialization', () => {
    const instance = SharedDeeplinkManager.getInstance();

    const spyExpireDeeplink = jest.spyOn(instance, 'expireDeeplink');

    SharedDeeplinkManager.expireDeeplink();

    expect(spyExpireDeeplink).toHaveBeenCalled();
  });
});
