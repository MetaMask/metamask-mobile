import handleParseWCProtocol from './handleParseWCProtocol';
import WC2Manager from '../../../core/WalletConnect/WalletConnectV2';

jest.mock('../../../core/WalletConnect/WalletConnectV2');
jest.mock('./extractURLParams');

describe('handleWCProtocol', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call handled and connect to WalletConnect with the correct parameters', async () => {
    const handledMock = jest.fn();
    const wcURL = 'wc:test';
    const origin = 'testOrigin';
    const params = { redirect: 'testRedirect' } as Parameters<
      typeof handleParseWCProtocol
    >[0]['params'];

    const connectMock = jest.fn().mockResolvedValue(null);
    WC2Manager.getInstance = jest.fn().mockResolvedValue({
      connect: connectMock,
    });

    await handleParseWCProtocol({
      handled: handledMock,
      wcURL,
      origin,
      params,
    });

    expect(handledMock).toHaveBeenCalled();
    expect(WC2Manager.getInstance).toHaveBeenCalled();
    expect(connectMock).toHaveBeenCalledWith({
      wcUri: wcURL,
      origin,
      redirectUrl: params.redirect,
    });
  });
});
