import { NavigationProp, ParamListBase } from '@react-navigation/native';
import DeeplinkManager from './DeeplinkManager';
import handleBrowserUrl from './Handlers/handleBrowserUrl';
import handleEthereumUrl from './Handlers/handleEthereumUrl';
import handleRampUrl from './Handlers/handleRampUrl';
import switchNetwork from './Handlers/switchNetwork';
import parseDeeplink from './ParseManager/parseDeeplink';
import approveTransaction from './TransactionManager/approveTransaction';
import { RampType } from '../../reducers/fiatOrders/types';

jest.mock('./TransactionManager/approveTransaction');
jest.mock('./Handlers/handleEthereumUrl');
jest.mock('./Handlers/handleBrowserUrl');
jest.mock('./Handlers/handleRampUrl');
jest.mock('./ParseManager/parseDeeplink');
jest.mock('./Handlers/switchNetwork');

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
    expect(switchNetwork).toHaveBeenCalledWith({
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
    const rampPath = '/example/path?and=params';
    deeplinkManager._handleBuyCrypto(rampPath);
    expect(handleRampUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        rampPath,
        navigation: mockNavigation,
        rampType: RampType.BUY,
      }),
    );
  });

  it('should handle sell crypto action correctly', () => {
    const rampPath = '/example/path?and=params';
    deeplinkManager._handleSellCrypto(rampPath);
    expect(handleRampUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        rampPath,
        navigation: mockNavigation,
        rampType: RampType.SELL,
      }),
    );
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
