import { HandlerType } from '@metamask/snaps-utils';
import type { CaipAssetType } from '@metamask/snaps-sdk';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import { handleSnapRequest } from '../../../../core/Snaps/utils';
import {
  confirmTronStake,
  confirmTronUnstake,
  computeTronFee,
  validateTronStakeAmount,
  validateTronUnstakeAmount,
  TronStakeValidateParams,
  TronStakeConfirmParams,
  TronUnstakeValidateParams,
  TronUnstakeConfirmParams,
} from './tron-staking-snap';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {} as unknown,
}));

jest.mock('../../../../core/Snaps/utils', () => ({
  handleSnapRequest: jest.fn(),
}));

const mockAccount = {
  address: '0x123',
  id: 'account-1',
  metadata: { snap: { id: 'npm:@metamask/tron-wallet-snap' } },
} as unknown as InternalAccount;

const mockParamsBase: Pick<TronStakeValidateParams, 'accountId' | 'assetId'> = {
  accountId: 'account-1',
  assetId: 'tron:728126428/slip44:195' as CaipAssetType,
};

describe('tron-staking utils', () => {
  const handleSnapRequestMock = handleSnapRequest as jest.MockedFunction<
    typeof handleSnapRequest
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls snap with onStakeAmountInput when validating stake amount', async () => {
    const params: TronStakeValidateParams = {
      ...mockParamsBase,
      value: '10',
    };
    handleSnapRequestMock.mockResolvedValueOnce({ valid: true });

    const result = await validateTronStakeAmount(mockAccount, params);

    expect(handleSnapRequestMock).toHaveBeenCalledWith(
      Engine.controllerMessenger,
      expect.objectContaining({
        handler: HandlerType.OnClientRequest,
        request: expect.objectContaining({
          method: 'onStakeAmountInput',
          params,
        }),
      }),
    );
    expect(result).toEqual({ valid: true });
  });

  it('calls snap with confirmStake when confirming stake', async () => {
    const params: TronStakeConfirmParams = {
      fromAccountId: 'account-1',
      assetId: mockParamsBase.assetId,
      value: '10',
      options: { purpose: 'ENERGY' } as TronStakeConfirmParams['options'],
    };
    handleSnapRequestMock.mockResolvedValueOnce({ valid: true });

    const result = await confirmTronStake(mockAccount, params);

    expect(handleSnapRequestMock).toHaveBeenCalledWith(
      Engine.controllerMessenger,
      expect.objectContaining({
        request: expect.objectContaining({
          method: 'confirmStake',
          params,
        }),
      }),
    );
    expect(result).toEqual({ valid: true });
  });

  it('calls snap with computeFee when computing fee', async () => {
    const params = {
      transaction: '0xabc',
      accountId: 'account-1',
      scope: 'tron:728126428',
    };
    const feeResult = [
      {
        type: 'network',
        asset: {
          unit: 'TRX',
          type: 'native',
          amount: '0.1',
          fungible: true,
        },
      },
    ];
    handleSnapRequestMock.mockResolvedValueOnce(feeResult);

    const result = await computeTronFee(mockAccount, params);

    expect(handleSnapRequestMock).toHaveBeenCalledWith(
      Engine.controllerMessenger,
      expect.objectContaining({
        request: expect.objectContaining({
          method: 'computeFee',
          params,
        }),
      }),
    );
    expect(result).toEqual(feeResult);
  });

  it('calls snap with onUnstakeAmountInput when validating unstake amount', async () => {
    const params: TronUnstakeValidateParams = {
      ...mockParamsBase,
      value: '5',
      options: { purpose: 'BANDWIDTH' } as TronUnstakeValidateParams['options'],
    };
    handleSnapRequestMock.mockResolvedValueOnce({ valid: false });

    const result = await validateTronUnstakeAmount(mockAccount, params);

    expect(handleSnapRequestMock).toHaveBeenCalledWith(
      Engine.controllerMessenger,
      expect.objectContaining({
        request: expect.objectContaining({
          method: 'onUnstakeAmountInput',
          params,
        }),
      }),
    );
    expect(result).toEqual({ valid: false });
  });

  it('calls snap with confirmUnstake when confirming unstake', async () => {
    const params: TronUnstakeConfirmParams = {
      value: '5',
      accountId: 'account-1',
      assetId: mockParamsBase.assetId,
      options: { purpose: 'ENERGY' } as TronUnstakeConfirmParams['options'],
    };
    handleSnapRequestMock.mockResolvedValueOnce({ valid: true });

    const result = await confirmTronUnstake(mockAccount, params);

    expect(handleSnapRequestMock).toHaveBeenCalledWith(
      Engine.controllerMessenger,
      expect.objectContaining({
        request: expect.objectContaining({
          method: 'confirmUnstake',
          params,
        }),
      }),
    );
    expect(result).toEqual({ valid: true });
  });
});
