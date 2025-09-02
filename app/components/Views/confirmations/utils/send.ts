import BN from 'bnjs4';
import { BNToHex, toHex } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import { Nft } from '@metamask/assets-controllers';
import {
  TransactionParams,
  TransactionType,
} from '@metamask/transaction-controller';
import { addHexPrefix } from 'ethereumjs-util';

import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { addTransaction } from '../../../../util/transaction-controller';
import { fetchEstimatedMultiLayerL1Fee } from '../../../../util/networks/engineNetworkUtils';
import { generateTransferData } from '../../../../util/transactions';
import { hexToBN, toTokenMinimalUnit, toWei } from '../../../../util/number';
import { AssetType, TokenStandard } from '../types/token';
import { MMM_ORIGIN } from '../constants/confirmations';
import { isNativeToken } from '../utils/generic';

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
  isSendRedesignEnabled: boolean,
  asset?: AssetType | Nft,
) => {
  if (isSendRedesignEnabled) {
    captureSendStartedEvent(location);
    let screen = Routes.SEND.ASSET;
    if (asset) {
      if (asset.standard === TokenStandard.ERC721) {
        screen = Routes.SEND.RECIPIENT;
      } else {
        screen = Routes.SEND.AMOUNT;
      }
    }
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
    trxnParams.data = generateTransferData(
      asset.standard === TokenStandard.ERC721
        ? 'transferFrom'
        : 'safeTransferFrom',
      {
        fromAddress: from,
        toAddress: to,
        tokenId: toHex(asset.tokenId),
        amount: toHex(value ?? 1),
      },
    );
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

  let transactionType;
  if (asset.isNative) {
    transactionType = TransactionType.simpleSend;
  } else if (asset.standard === TokenStandard.ERC20) {
    transactionType = TransactionType.tokenMethodTransfer;
  } else if (asset.standard === TokenStandard.ERC721) {
    transactionType = TransactionType.tokenMethodTransferFrom;
  } else if (asset.standard === TokenStandard.ERC1155) {
    transactionType = TransactionType.tokenMethodSafeTransferFrom;
  }

  await addTransaction(trxnParams, {
    origin: MMM_ORIGIN,
    networkClientId,
    type: transactionType,
  });
};

export function formatToFixedDecimals(value: string, decimalsToShow = 5) {
  if (value) {
    const decimals = decimalsToShow < 5 ? decimalsToShow : 5;
    const result = String(value).replace(/^-/, '').split('.');
    const intPart = result[0];
    let fracPart = result[1] ?? '';

    if (new BN(`${intPart}${fracPart}`).isZero()) {
      return '0';
    }

    if (fracPart.length > decimals) {
      fracPart = fracPart.slice(0, decimals);
    } else {
      fracPart = fracPart.padEnd(decimals, '0');
    }

    if (new BN(`${intPart}${fracPart}`).lt(new BN(1))) {
      return `< ${1 / Math.pow(10, decimals)}`;
    }

    return `${intPart}.${fracPart}`
      .replace(/\.?[0]+$/, '')
      .replace(/\.?[.]+$/, '');
  }
  return '0';
}

export const toBNWithDecimals = (input: string, decimals: number) => {
  const result = String(input).replace(/^-/, '').split('.');
  const intPart = result[0];
  let fracPart = result[1] ?? '';

  if (fracPart.length > decimals) {
    fracPart = fracPart.slice(0, decimals);
  }

  fracPart = fracPart.padEnd(decimals, '0');

  return new BN(intPart || '0')
    .mul(new BN(10).pow(new BN(decimals)))
    .add(new BN(fracPart || '0'));
};

export const fromBNWithDecimals = (bnValue: BN, decimals: number) => {
  const base = new BN(10).pow(new BN(decimals));
  const intPart = bnValue.div(base).toString();
  const fracPart = bnValue.mod(base).toString().padStart(decimals, '0');
  const trimmedFrac = fracPart.replace(/0+$/, '');
  return trimmedFrac ? `${intPart}.${trimmedFrac}` : intPart;
};

export const fromHexWithDecimals = (value: Hex, decimals: number) => {
  const bnValue = hexToBN(value);
  return fromBNWithDecimals(bnValue, decimals);
};

export const fromTokenMinUnits = (
  value: string,
  decimals?: number | string,
) => {
  const decimalValue = parseInt(decimals?.toString() ?? '0', 10);
  const multiplier = new BN(10).pow(new BN(decimalValue));
  return addHexPrefix(new BN(value).mul(multiplier).toString(16));
};

export const getLayer1GasFeeForSend = async ({
  asset,
  chainId,
  from,
  value,
}: {
  asset: AssetType;
  chainId: Hex;
  from: Hex;
  value: string;
}): Promise<Hex | undefined> => {
  const txParams = {
    chainId,
    from,
    value: fromTokenMinUnits(value, asset.decimals),
  };
  return (await fetchEstimatedMultiLayerL1Fee(undefined, {
    txParams,
    chainId,
  })) as Hex;
};
