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
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the pending deeplink before each test
    DeeplinkManager.expireDeeplink();
  });

  it('should set, get, and expire a deeplink correctly', () => {
    const testUrl = 'https://example.com';
    DeeplinkManager.setDeeplink(testUrl);
    expect(DeeplinkManager.getPendingDeeplink()).toBe(testUrl);

    DeeplinkManager.expireDeeplink();
    expect(DeeplinkManager.getPendingDeeplink()).toBeNull();
  });

  it('should parse deeplinks correctly', async () => {
    const url = 'http://example.com';
    const browserCallBack = jest.fn();
    const origin = 'testOrigin';
    const onHandled = jest.fn();

    await DeeplinkManager.parse(url, {
      browserCallBack,
      origin,
      onHandled,
    });

    expect(parseDeeplink).toHaveBeenCalledWith({
      url,
      origin,
      browserCallBack,
      onHandled,
    });
  });

  // Tests for standalone handler functions
  it('should handle network switch correctly', () => {
    const chainId = '1';
    switchNetwork({ switchToChainId: chainId });
    expect(switchNetwork).toHaveBeenCalledWith({
      switchToChainId: chainId,
    });
  });

  it('should handle transaction approval correctly', async () => {
    const ethUrl = {
      parameters: {},
      target_address: '0x...',
      chain_id: '1',
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const origin = 'testOrigin';

    await approveTransaction({
      ethUrl,
      origin,
    });

    expect(approveTransaction).toHaveBeenCalledWith({
      ethUrl,
      origin,
    });
  });

  it('should handle Ethereum URL correctly', async () => {
    const url = 'ethereum://example.com';
    const origin = 'testOrigin';

    await handleEthereumUrl({
      url,
      origin,
    });

    expect(handleEthereumUrl).toHaveBeenCalledWith({
      url,
      origin,
    });
  });

  it('should handle browser URL correctly', () => {
    const url = 'http://example.com';
    const callback = jest.fn();

    handleBrowserUrl({
      url,
      callback,
    });

    expect(handleBrowserUrl).toHaveBeenCalledWith({
      url,
      callback,
    });
  });

  it('should handle buy crypto action correctly', () => {
    const rampPath = '/example/path?and=params';
    handleRampUrl({
      rampPath,
      rampType: RampType.BUY,
    });
    expect(handleRampUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        rampPath,
        rampType: RampType.BUY,
      }),
    );
  });

  it('should handle sell crypto action correctly', () => {
    const rampPath = '/example/path?and=params';
    handleRampUrl({
      rampPath,
      rampType: RampType.SELL,
    });
    expect(handleRampUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        rampPath,
        rampType: RampType.SELL,
      }),
    );
  });
});
