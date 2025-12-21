import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import { Connection } from '../Connection';
import DevLogger from '../utils/DevLogger';
import setupBridge from './setupBridge';

jest.mock('../../BackgroundBridge/BackgroundBridge');
jest.mock('../Connection');
jest.mock('../utils/DevLogger');
jest.mock('./handleSendMessage');
jest.mock('../../../util/Logger');
jest.mock('../../AppConstants');
jest.mock('../../../constants/deeplinks');

describe('setupBridge', () => {
  let originatorInfo = {} as OriginatorInfo;
  let connection = {} as unknown as Connection;

  beforeEach(() => {
    jest.clearAllMocks();
    originatorInfo = {
      url: 'https://example.com',
      dappId: 'https://example.com',
      title: 'Test Title',
      platform: 'testPlatform',
    };
    connection = {
      origin: 'testOrigin',
      trigger: 'testTrigger',
    } as unknown as Connection;
  });

  it('should returns existing backgroundBridge if it already exists', () => {
    const existingBridge = new BackgroundBridge();
    connection.backgroundBridge = existingBridge;

    const result = setupBridge({ originatorInfo, connection });

    expect(result).toBe(existingBridge);
    expect(DevLogger.log).toHaveBeenCalledWith(
      `setupBridge:: backgroundBridge already exists`,
    );
  });

  it('should creates a new backgroundBridge if it does not exist', () => {
    connection.backgroundBridge = undefined;

    const result = setupBridge({ originatorInfo, connection });

    expect(result).toBeInstanceOf(BackgroundBridge);
    expect(BackgroundBridge).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should setup backgroundBridge with correct url and isRemoteConn', () => {
    connection.backgroundBridge = undefined;
    const expectedUrl = originatorInfo.url;
    setupBridge({ originatorInfo, connection });
    expect(BackgroundBridge).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expectedUrl,
        isRemoteConn: true,
      }),
    );
  });

  it('should setup backgroundBridge with correct sendMessage', () => {
    connection.backgroundBridge = undefined;

    setupBridge({ originatorInfo, connection });

    expect(BackgroundBridge).toHaveBeenCalledWith(
      expect.objectContaining({
        sendMessage: expect.any(Function),
      }),
    );
  });

  it('should setup backgroundBridge with correct getApprovedHosts', () => {
    connection.backgroundBridge = undefined;

    setupBridge({ originatorInfo, connection });

    expect(BackgroundBridge).toHaveBeenCalledWith(
      expect.objectContaining({
        getApprovedHosts: expect.any(Function),
      }),
    );
  });

  it('should setup backgroundBridge with correct remoteConnHost', () => {
    connection.backgroundBridge = undefined;

    setupBridge({ originatorInfo, connection });

    expect(BackgroundBridge).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteConnHost: connection.host,
      }),
    );
  });

  it('should setup backgroundBridge with correct getRpcMethodMiddleware', () => {
    connection.backgroundBridge = undefined;

    setupBridge({ originatorInfo, connection });

    expect(BackgroundBridge).toHaveBeenCalledWith(
      expect.objectContaining({
        getRpcMethodMiddleware: expect.any(Function),
      }),
    );
  });

  it('should setup backgroundBridge with correct params', () => {
    connection.backgroundBridge = undefined;

    setupBridge({ originatorInfo, connection });

    expect(BackgroundBridge).toHaveBeenCalledWith(
      expect.objectContaining({
        webview: null,
        isMMSDK: true,
      }),
    );
  });

  it('should throw error when originatorInfo.url is "metamask"', () => {
    connection.backgroundBridge = undefined;
    originatorInfo.url = 'metamask';

    expect(() => setupBridge({ originatorInfo, connection })).toThrow(
      'Connections from metamask origin are not allowed',
    );
    expect(BackgroundBridge).not.toHaveBeenCalled();
  });

  it('should throw error when originatorInfo.title is "metamask"', () => {
    connection.backgroundBridge = undefined;
    originatorInfo.url = 'https://example.com';
    originatorInfo.title = 'metamask';

    expect(() => setupBridge({ originatorInfo, connection })).toThrow(
      'Connections from metamask origin are not allowed',
    );
    expect(BackgroundBridge).not.toHaveBeenCalled();
  });

  it('should allow connection when originatorInfo contains "metamask" as substring', () => {
    connection.backgroundBridge = undefined;
    originatorInfo.url = 'https://my-metamask-dapp.com';
    originatorInfo.title = 'My MetaMask App';

    expect(() => setupBridge({ originatorInfo, connection })).not.toThrow();
    expect(BackgroundBridge).toHaveBeenCalled();
  });

  it('should allow connection when originatorInfo has valid url and title', () => {
    connection.backgroundBridge = undefined;
    originatorInfo.url = 'https://example.com';
    originatorInfo.title = 'Example Dapp';

    expect(() => setupBridge({ originatorInfo, connection })).not.toThrow();
    expect(BackgroundBridge).toHaveBeenCalled();
  });
});
