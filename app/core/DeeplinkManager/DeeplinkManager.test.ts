import DeeplinkManager from './DeeplinkManager';
import handleNetworkSwitch from './handlers/handleNetworkSwitch';
import approveTransaction from './TransactionsManger/approveTransaction';
import handleEthereumUrl from './handlers/handleEthereumUrl';
import handleBrowserUrl from './handlers/handleBrowserUrl';
import handleBuyCrypto from './handlers/handleBuyCrypto';
import parseDeeplink from './ParseManager/parseDeeplink';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

jest.mock('./handlers/handleNetworkSwitch');
jest.mock('./TransactionsManger/approveTransaction');
jest.mock('./handlers/handleEthereumUrl');
jest.mock('./handlers/handleBrowserUrl');
jest.mock('./handlers/handleBuyCrypto');
jest.mock('./ParseManager/parseDeeplink');

const mockNavigation = {
  navigate: jest.fn(),
} as unknown as NavigationProp<ParamListBase>;

const mockDispatch = jest.fn();

describe('DeeplinkManager', () => {
  let deeplinkManager = new DeeplinkManager({
    navigation: mockNavigation,
    dispatch: mockDispatch,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    deeplinkManager = new DeeplinkManager({
      navigation: mockNavigation,
      dispatch: mockDispatch,
    });
  });

  it('should set, get, and expire a deeplink correctly', () => {
    const testUrl = 'https://example.com';
    deeplinkManager.setDeeplink(testUrl);
    expect(deeplinkManager.getPendingDeeplink()).toBe(testUrl);

    deeplinkManager.expireDeeplink();
    expect(deeplinkManager.getPendingDeeplink()).toBeNull();
  });

  it('should handle network switch correctly', () => {
    const chainId = '1';
    deeplinkManager._handleNetworkSwitch(chainId);
    expect(handleNetworkSwitch).toHaveBeenCalledWith({
      deeplinkManager,
      switchToChainId: chainId,
    });
  });

  it('should handle transaction approval correctly', async () => {
    const ethUrl = {
      parameters: {},
      target_address: '0x...',
      chain_id: '1',
    } as any;

    const origin = 'testOrigin';

    await deeplinkManager._approveTransaction(ethUrl, origin);

    expect(approveTransaction).toHaveBeenCalledWith({
      deeplinkManager,
      ethUrl,
      origin,
    });
  });

  it('should handle Ethereum URL correctly', async () => {
    const url = 'ethereum://example.com';
    const origin = 'testOrigin';

    await deeplinkManager._handleEthereumUrl(url, origin);

    expect(handleEthereumUrl).toHaveBeenCalledWith({
      deeplinkManager,
      url,
      origin,
    });
  });

  it('should handle browser URL correctly', () => {
    const url = 'http://example.com';
    const callback = jest.fn();

    deeplinkManager._handleBrowserUrl(url, callback);

    expect(handleBrowserUrl).toHaveBeenCalledWith({
      deeplinkManager,
      url,
      callback,
    });
  });

  it('should handle buy crypto action correctly', () => {
    deeplinkManager._handleBuyCrypto();

    expect(handleBuyCrypto).toHaveBeenCalledWith({
      deeplinkManager,
    });
  });
  it('should parse deeplinks correctly', () => {
    const url = 'http://example.com';
    const browserCallBack = jest.fn();
    const origin = 'testOrigin';
    const onHandled = jest.fn();

    deeplinkManager.parse(url, {
      browserCallBack,
      origin,
      onHandled,
    });

    expect(parseDeeplink).toHaveBeenCalledWith({
      deeplinkManager,
      url,
      origin,
      browserCallBack,
      onHandled,
    });
  });
});
