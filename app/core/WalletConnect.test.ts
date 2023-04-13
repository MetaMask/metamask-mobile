import { v1 } from 'uuid';
import RNWalletConnect from '@walletconnect/client';
import WalletConnect from './WalletConnect';
import Engine from './Engine';
import { ApprovalTypes } from '../core/RPCMethods/RPCMethodMiddleware';

import { flushPromises } from '../util/test/utils';

jest.mock('@walletconnect/client');
jest.mock('./Engine', () => ({
  context: {
    KeyringController: {
      isUnlocked: jest.fn().mockReturnValueOnce(true),
    },
    ApprovalController: {
      add: jest.fn()
    }
  },
}));
const mockRandomId = '139404b0-1dd2-11b2-b040-cb962b38df0e';
jest.mock('uuid', () => ({
  v1: jest.fn(() => mockRandomId),
}));

const mockDappHost = 'metamask.io';
const mockDappUrl = `https://${mockDappHost}`;
const mockAutoSign = false;
const mockRedirectUrl = `${mockDappUrl}/redirect`;
const mockDappOrigin = 'origin';

const mockSessionRequest = {
  params: [
    {
      peerMeta: {
        url: mockDappUrl,
      }
    }
  ]
};

describe('WalletConnect', () => {
  it('should add new approval on ', async () => {
    const sessionRequestCallback = jest.fn().mockImplementationOnce((_, callback) => {
      callback(null, mockSessionRequest);
    });
    RNWalletConnect.mockImplementation(() => ({
      on: sessionRequestCallback,
    }));

    const expectedApprovalRequest = {
      "id": mockRandomId,
      "origin": mockDappHost,
      "requestData": {
        "autosign": mockAutoSign,
        "peerMeta": {
          "url": mockDappUrl,
        },
        "redirectUrl": mockRedirectUrl,
        "requestOriginatedFrom": mockDappOrigin,
      },
      "type": ApprovalTypes.WALLET_CONNECT,
    }

    const spyApprovalControllerAdd = jest.spyOn(Engine.context.ApprovalController, 'add');

    // Initialize WalletConnect
    await WalletConnect.init();

    // WalletConnect.newSession will reproduce the same behavior as the DeeplinkHandler
    // See app/core/DeeplinkManager.js, then sessionRequestCallback will be picked up immediately
    await WalletConnect.newSession(
      "URI",
      mockRedirectUrl,
      mockAutoSign,
      "origin",
    );

    await flushPromises();

    expect(spyApprovalControllerAdd).toHaveBeenCalled();
    expect(spyApprovalControllerAdd).toHaveBeenCalledWith(expectedApprovalRequest);
  })
});