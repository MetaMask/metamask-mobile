import { HandlerType } from '@metamask/snaps-utils';
import Engine from '../../core/Engine';
import { handleSnapRequest } from '../../core/Snaps/utils';
import { STELLAR_WALLET_SNAP_ID } from '../../core/SnapKeyring/StellarWalletSnap';
import {
  requestStellarChangeTrustOptAdd,
  requestStellarChangeTrustOptDelete,
} from './stellar-snap-client-requests';

jest.mock('../../core/Engine', () => ({
  controllerMessenger: {},
  context: {
    MultichainBalancesController: {
      updateBalance: jest.fn(),
    },
  },
}));

jest.mock('../../core/Snaps/utils', () => ({
  handleSnapRequest: jest.fn(),
}));

describe('stellar-snap-client-requests', () => {
  const handleSnapRequestMock = handleSnapRequest as jest.MockedFunction<
    typeof handleSnapRequest
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls changeTrustOpt add via handleSnapRequest', async () => {
    handleSnapRequestMock.mockResolvedValueOnce({ status: true });

    const result = await requestStellarChangeTrustOptAdd({
      accountId: 'account-id',
      assetId:
        'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      scope: 'stellar:pubnet',
    });

    expect(result).toStrictEqual({ status: true });
    expect(handleSnapRequestMock).toHaveBeenCalledWith(
      Engine.controllerMessenger,
      {
        snapId: STELLAR_WALLET_SNAP_ID,
        origin: 'metamask',
        handler: HandlerType.OnClientRequest,
        request: {
          method: 'changeTrustOpt',
          params: {
            accountId: 'account-id',
            assetId:
              'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
            scope: 'stellar:pubnet',
            action: 'add',
          },
        },
      },
    );
  });

  it('calls changeTrustOpt delete via handleSnapRequest', async () => {
    handleSnapRequestMock.mockResolvedValueOnce({ status: true });

    await requestStellarChangeTrustOptDelete({
      accountId: 'account-id',
      assetId:
        'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      scope: 'stellar:pubnet',
    });

    expect(handleSnapRequestMock).toHaveBeenCalledWith(
      Engine.controllerMessenger,
      expect.objectContaining({
        request: expect.objectContaining({
          params: expect.objectContaining({ action: 'delete' }),
        }),
      }),
    );
  });
});
