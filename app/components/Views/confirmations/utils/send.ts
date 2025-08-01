import { BNToHex, toHex } from '@metamask/controller-utils';
import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { Nft } from '@metamask/assets-controllers';
import { SnapId } from '@metamask/snaps-sdk';
import { TransactionParams } from '@metamask/transaction-controller';

import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { addTransaction } from '../../../../util/transaction-controller';
import { generateTransferData } from '../../../../util/transactions';
import { sendMultichainTransaction } from '../../../../core/SnapKeyring/utils/sendMultichainTransaction';
import { toTokenMinimalUnit, toWei } from '../../../../util/number';
import { AssetType } from '../types/token';
import { MMM_ORIGIN } from '../constants/confirmations';
import { isNativeToken } from '../utils/generic';

export const isSendRedesignEnabled = () =>
  process.env.MM_SEND_REDESIGN_ENABLED === 'true';

export const handleSendPageNavigation = (
  navigate: <RouteName extends string>(
    screenName: RouteName,
    params?: object,
  ) => void,
  asset?: AssetType | Nft,
  chainId?: string,
) => {
  if (isSendRedesignEnabled()) {
    navigate(Routes.SEND.DEFAULT, {
      screen: Routes.SEND.ROOT,
      params: {
        asset,
        chainId,
      },
    });
  } else {
    navigate('SendFlowView');
  }
};

export const prepareEVMTransaction = (
  asset: AssetType,
  transactionParams: TransactionParams,
) => {
  const { from, to, value } = transactionParams;
  const trxnParams: TransactionParams = { from };
  if (isNativeToken(asset)) {
    trxnParams.data = '0x';
    trxnParams.to = to;
    trxnParams.value = BNToHex(toWei(value ?? '0') as unknown as BigNumber);
  } else if (asset.tokenId) {
    // NFT token
    trxnParams.data = generateTransferData('transferFrom', {
      fromAddress: from,
      toAddress: to,
      tokenId: toHex(asset.tokenId),
    });
    trxnParams.to = asset.address;
    trxnParams.value = '0x0';
  } else {
    // ERC20 token
    const tokenAmount = toTokenMinimalUnit(value ?? '0', asset.decimals);
    trxnParams.data = generateTransferData('transfer', {
      toAddress: to,
      amount: BNToHex(tokenAmount),
    });
    trxnParams.to = asset.address;
    trxnParams.value = '0x0';
  }
  return trxnParams;
};

export const submitEVMTransaction = async ({
  asset,
  chainId,
  from,
  to,
  value,
}: {
  asset: AssetType;
  chainId: Hex;
  from: Hex;
  to: Hex;
  value: string;
}) => {
  const { NetworkController } = Engine.context;
  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    chainId as Hex,
  );
  // toHex is added here as sometime chainId in asset is not hexadecimal
  const trxnParams = prepareEVMTransaction(asset, { from, to, value });
  await addTransaction(trxnParams, {
    origin: MMM_ORIGIN,
    networkClientId,
  });
};

export const submitNonEVMTransaction = async ({
  asset,
  fromAccount,
}: {
  asset: AssetType;
  fromAccount: InternalAccount;
}) => {
  await sendMultichainTransaction(fromAccount.metadata?.snap?.id as SnapId, {
    account: fromAccount.id,
    scope: asset.chainId as CaipChainId,
    assetId: asset.address as CaipAssetType,
  });
};
