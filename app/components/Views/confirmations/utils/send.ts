import BN from 'bnjs4';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';
import { Nft } from '@metamask/assets-controllers';
import {
  TransactionParams,
  TransactionType,
} from '@metamask/transaction-controller';
import { addHexPrefix } from 'ethereumjs-util';
import { encode } from '@metamask/abi-utils';
import { toHex } from '@metamask/controller-utils';

import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { addTransaction } from '../../../../util/transaction-controller';
import {
  collectConfusables,
  getConfusablesExplanations,
  hasZeroWidthPoints,
} from '../../../../util/confusables';
import { fetchEstimatedMultiLayerL1Fee } from '../../../../util/networks/engineNetworkUtils';
import {
  NFT_SAFE_TRANSFER_FROM_FUNCTION_SIGNATURE,
  TRANSFER_FROM_FUNCTION_SIGNATURE,
  TRANSFER_FUNCTION_SIGNATURE,
} from '../../../../util/transactions';
import { BNToHex, hexToBN, toWei } from '../../../../util/number';
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

export function isValidPositiveNumericString(str: string) {
  const decimalRegex = /^(\d+(\.\d+)?|\.\d+)$/;

  if (!decimalRegex.test(str)) return false;

  try {
    const num = new BigNumber(str);
    return num.isGreaterThanOrEqualTo(new BigNumber(0));
  } catch {
    return false;
  }
}

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

function generateERC20TransferData({
  toAddress,
  amount,
}: {
  toAddress: Hex;
  amount: Hex;
}) {
  return (
    TRANSFER_FUNCTION_SIGNATURE +
    Array.prototype.map
      .call(
        encode(
          ['address', 'uint256'],
          [addHexPrefix(toAddress), addHexPrefix(amount)],
        ),
        (x) => `00${x.toString(16)}`.slice(-2),
      )
      .join('')
  );
}

function generateERC721TransferData({
  toAddress,
  fromAddress,
  tokenId,
}: {
  toAddress: Hex;
  fromAddress: Hex;
  tokenId: string;
}) {
  return (
    TRANSFER_FROM_FUNCTION_SIGNATURE +
    Array.prototype.map
      .call(
        encode(
          ['address', 'address', 'uint256'],
          [addHexPrefix(fromAddress), addHexPrefix(toAddress), BigInt(tokenId)],
        ),
        (x) => `00${x.toString(16)}`.slice(-2),
      )
      .join('')
  );
}

function generateERC1155TransferData({
  toAddress,
  fromAddress,
  tokenId,
  amount,
  data = '0',
}: {
  toAddress: Hex;
  fromAddress: Hex;
  tokenId: string;
  amount: string;
  data?: string;
}) {
  return (
    NFT_SAFE_TRANSFER_FROM_FUNCTION_SIGNATURE +
    Array.prototype.map
      .call(
        encode(
          ['address', 'address', 'uint256', 'uint256', 'bytes'],
          [
            addHexPrefix(fromAddress),
            addHexPrefix(toAddress),
            BigInt(tokenId),
            addHexPrefix(amount),
            addHexPrefix(data),
          ],
        ),
        (x) => `00${x.toString(16)}`.slice(-2),
      )
      .join('')
  );
}

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
  } else if (asset.standard === TokenStandard.ERC721) {
    trxnParams.data = generateERC721TransferData({
      fromAddress: from as Hex,
      toAddress: to as Hex,
      tokenId: asset.tokenId ?? '0',
    });
    trxnParams.to = asset.address;
    trxnParams.value = '0x0';
  } else if (asset.standard === TokenStandard.ERC1155) {
    trxnParams.data = generateERC1155TransferData({
      fromAddress: from as Hex,
      toAddress: to as Hex,
      tokenId: asset.tokenId ?? '0',
      amount: toHex(value ?? 1),
    });
    trxnParams.to = asset.address;
    trxnParams.value = '0x0';
  } else {
    // ERC20 token
    const tokenAmount = toTokenMinimalUnit(value ?? '0', asset.decimals);
    trxnParams.data = generateERC20TransferData({
      toAddress: to as Hex,
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

export function toTokenMinimalUnit(tokenValue: string, decimals: number) {
  const decimalValue = parseInt(decimals?.toString(), 10);
  const multiplier = new BN(10).pow(new BN(decimalValue));

  const comps = tokenValue.split('.');

  let whole = comps[0],
    fraction = comps[1];
  if (!whole) {
    whole = '0';
  }
  if (!fraction) {
    fraction = '';
  }
  if (fraction.length > decimalValue) {
    fraction = fraction.slice(0, decimalValue);
  } else {
    fraction = fraction.padEnd(decimalValue, '0');
  }

  const wholeBN = new BN(whole);
  const fractionBN = new BN(fraction);
  const tokenMinimal = wholeBN.mul(multiplier).add(fractionBN);
  return new BN(tokenMinimal.toString(10), 10);
}

export function formatToFixedDecimals(
  value: string,
  decimalsToShow = 5,
  formatSmallValue = true,
  trimTrailingZero = true,
) {
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

    if (formatSmallValue && new BN(`${intPart}${fracPart}`).lt(new BN(1))) {
      return `< ${1 / Math.pow(10, decimals)}`;
    }

    let newValue = `${intPart}.${fracPart}`;
    if (trimTrailingZero) {
      newValue = newValue.replace(/\.?0+$/, '');
    }
    return newValue.replace(/\.?[.]+$/, '');
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
}) => {
  const txParams = {
    chainId,
    from,
    value: fromTokenMinUnits(value, asset.decimals),
  };
  return await fetchEstimatedMultiLayerL1Fee(undefined, {
    txParams,
    chainId,
  });
};

export const convertCurrency = (
  value: string,
  conversionRate: number,
  decimals?: number,
  targetDecimals?: number,
  trimTrailingZero: boolean = false,
) => {
  let sourceDecimalValue = parseInt(decimals?.toString() ?? '0', 10);
  const targetDecimalValue = parseInt(targetDecimals?.toString() ?? '0', 10);

  const conversionRateDecimals = (
    conversionRate?.toString().replace(/^-/, '').split('.')[1] ?? ''
  ).length;

  const convertedValueBN = toBNWithDecimals(value, sourceDecimalValue);
  const conversionRateBN = toBNWithDecimals(
    conversionRate.toString(),
    conversionRateDecimals,
  );
  sourceDecimalValue += conversionRateDecimals;

  const convertedValue = convertedValueBN.mul(conversionRateBN);

  return formatToFixedDecimals(
    fromBNWithDecimals(convertedValue, sourceDecimalValue),
    targetDecimalValue,
    false,
    trimTrailingZero,
  );
};

export const getConfusableCharacterInfo = (
  toAddress: string,
  strings: (key: string) => string,
) => {
  const confusableCollection = collectConfusables(toAddress);
  if (confusableCollection.length) {
    const invalidAddressMessage = strings('transaction.invalid_address');
    const confusableCharacterWarningMessage = `${strings(
      'transaction.confusable_msg',
    )} - ${getConfusablesExplanations(confusableCollection)}`;
    const invisibleCharacterWarningMessage = strings(
      'send.invisible_character_error',
    );
    const isError = confusableCollection.some(hasZeroWidthPoints);
    if (isError) {
      // Show ERROR for zero-width characters (more important than warning)
      return {
        error: invalidAddressMessage,
        warning: invisibleCharacterWarningMessage,
      };
    }
    // Show WARNING for confusable characters
    return {
      warning: confusableCharacterWarningMessage,
    };
  }
  return {};
};

export const getFractionLength = (value: string) => {
  const result = value.replace(/^-/, '').split('.');
  const fracPart = result[1] ?? '';
  return fracPart.length;
};

export const addLeadingZeroIfNeeded = (value?: string) => {
  if (!value) {
    return value;
  }
  const result = value.replace(/^-/u, '').split('.');
  const wholePart = result[0];
  const fracPart = result[1] ?? '';
  if (!wholePart.length) {
    return `0.${fracPart}`;
  }
  return value;
};
