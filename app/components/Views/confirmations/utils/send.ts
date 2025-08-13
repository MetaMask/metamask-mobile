import BN from 'bnjs4';
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
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

export const isSendRedesignEnabled = () =>
  process.env.MM_SEND_REDESIGN_ENABLED === 'true';

const captureSendStartedEvent = (location: string) => {
  const { trackEvent } = MetaMetrics.getInstance();
  trackEvent(
    MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.SEND_STARTED)
      .addProperties({ location })
      .build(),
  );
};

export const handleSendPageNavigation = (
  navigate: <RouteName extends string>(
    screenName: RouteName,
    params?: object,
  ) => void,
  location: string,
  asset?: AssetType | Nft,
) => {
  if (isSendRedesignEnabled()) {
    captureSendStartedEvent(location);
    const screen = asset ? Routes.SEND.AMOUNT : Routes.SEND.ASSET;
    navigate(Routes.SEND.DEFAULT, {
      screen,
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

export const submitEvmTransaction = async ({
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
  const networkClientId =
    NetworkController.findNetworkClientIdByChainId(chainId);
  const trxnParams = prepareEVMTransaction(asset, { from, to, value });
  await addTransaction(trxnParams, {
    origin: MMM_ORIGIN,
    networkClientId,
  });
};

// todo: we need to figure out passing toAddress, amount also to the snap
export const submitNonEvmTransaction = async ({
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

export function formatToFixedDecimals(value: string, decimalsToShow = 5) {
  const decimals = decimalsToShow < 5 ? decimalsToShow : 5;
  const val = parseFloat(value);
  if (val) {
    const minVal = 1 / Math.pow(10, decimals);
    if (val < minVal) {
      return `< ${minVal}`;
    }
    return val.toFixed(decimals);
  }
  return '0';
}

export const toBNWithDecimals = (input: string, decimals: number) => {
  const neg = String(input).trim().startsWith('-');
  const result = String(input).replace(/^-/, '').split('.');
  const intPart = result[0];
  let fracPart = result[1] ?? '';

  if (fracPart.length > decimals) {
    fracPart = fracPart.slice(0, decimals);
  }

  fracPart = fracPart.padEnd(decimals, '0');

  const bn = new BN(intPart || '0')
    .mul(new BN(10).pow(new BN(decimals)))
    .add(new BN(fracPart || '0'));

  return neg ? bn.neg() : bn;
};

export const fromBNWithDecimals = (bnValue: BN, decimals: number) => {
  const base = new BN(10).pow(new BN(decimals));
  const intPart = bnValue.div(base).toString();
  const fracPart = bnValue.mod(base).toString().padStart(decimals, '0');
  const trimmedFrac = fracPart.replace(/0+$/, '');
  return trimmedFrac ? `${intPart}.${trimmedFrac}` : intPart;
};
