import { BNToHex, toHex } from '@metamask/controller-utils';
import { Nft } from '@metamask/assets-controllers';
import { TransactionParams } from '@metamask/transaction-controller';

import Routes from '../../../../constants/navigation/Routes';
import { generateTransferData } from '../../../../util/transactions';
import { toTokenMinimalUnit, toWei } from '../../../../util/number';
import { AssetType } from '../types/token';
import { isNativeToken } from '../utils/generic';

export const isSendRedesignEnabled = () =>
  process.env.MM_SEND_REDESIGN_ENABLED === 'true';

export const handleSendPageNavigation = (
  navigate: <RouteName extends string>(
    screenName: RouteName,
    params?: object,
  ) => void,
  asset: AssetType | Nft,
) => {
  if (isSendRedesignEnabled()) {
    navigate(Routes.SEND.DEFAULT, {
      screen: Routes.SEND.ROOT,
      params: {
        asset,
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
