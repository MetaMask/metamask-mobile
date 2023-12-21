import { NavigationProp, ParamListBase } from '@react-navigation/native';
import SharedDeeplinkManager from './SharedDeeplinkManager';
import DeeplinkManager from './DeeplinkManager';

describe('SharedDeeplinkManager', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  } as unknown as NavigationProp<ParamListBase>;

  const mockDispatch = jest.fn();

  beforeAll(() => {
    SharedDeeplinkManager.init({
      navigation: mockNavigation,
      dispatch: mockDispatch,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call init method on the DeeplinkManager instance after initialization', () => {
    const spyInit = jest.spyOn(SharedDeeplinkManager, 'init');

    const navigation = {
      navigate: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>;

    const dispatch = jest.fn();

    SharedDeeplinkManager.init({
      navigation,
      dispatch,
    });

    expect(spyInit).toHaveBeenCalledWith({
      navigation,
      dispatch,
    });
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
