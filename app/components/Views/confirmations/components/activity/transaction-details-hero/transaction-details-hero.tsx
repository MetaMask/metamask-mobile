import React from 'react';
import { Image, StyleProp, StyleSheet, TextStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { type Hex } from '@metamask/utils';
import { Box } from '../../../../../UI/Box/Box';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  hasTransactionType,
  parseStandardTokenTransactionData,
} from '../../../utils/transaction';
import { Result } from '@ethersproject/abi';
import { calcTokenAmount } from '../../../../../../util/transactions';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './transaction-details-hero.styles';
import { getTokenTransferData } from '../../../utils/transaction-pay';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { PERPS_CURRENCY, ARBITRUM_USDC } from '../../../constants/perps';
import { POLYGON_PUSD } from '../../../constants/predict';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { BigNumber } from 'bignumber.js';
import {
  convertMusdClaimAmount,
  getClaimPayoutFromReceipt,
} from '../../../../../UI/Earn/utils/musd';
import {
  selectConversionRateByChainId,
  selectCurrencyRates,
} from '../../../../../../selectors/currencyRateController';
import { RootState } from '../../../../../../reducers';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { TokenIcon } from '../../token-icon';
import { resolveMusdTransferMeta } from '../../../../../UI/Money/constants/activityStyles';
import { fromTokenMinimalUnit } from '../../../../../../util/number/bigint';
import {
  isMusdToken,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
  MUSD_DECIMALS,
} from '../../../../../UI/Earn/constants/musd';
import { selectTransactionsByIds } from '../../../../../../selectors/transactionController';
import { RELAY_DEPOSIT_TYPES } from '../../../constants/confirmations';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { strings } from '../../../../../../../locales/i18n';
import MoneyIcon from '../../../../../../images/money.png';

const iconStyles = StyleSheet.create({
  moneyIcon: { width: 32, height: 32, borderRadius: 16 },
});

const SUPPORTED_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.musdClaim,
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

const TOKEN_ICON_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.musdConversion,
];

const TWO_ASSET_HERO_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

interface TokenDisplayData {
  amount: string;
  symbol: string;
  address: string;
  chainId: Hex;
}

function TwoAssetHero({
  sentData,
  receivedData,
}: {
  sentData: TokenDisplayData;
  receivedData: TokenDisplayData;
}) {
  const { styles } = useStyles(styleSheet, {});

  const moneyIcon = (
    <Image
      source={MoneyIcon}
      style={iconStyles.moneyIcon}
      testID="money-account-icon"
    />
  );

  return (
    <Box testID="transaction-details-hero" gap={4} style={styles.container}>
      <AssetLine
        label={strings('transaction_details.label.you_sent')}
        sign="-"
        data={sentData}
        iconOverride={isMusdToken(sentData.address) && moneyIcon}
      />
      <AssetLine
        label={strings('transaction_details.label.you_received')}
        labelStyle={styles.youReceivedLabel}
        sign="+"
        data={receivedData}
        amountColor={TextColor.Success}
        iconOverride={isMusdToken(receivedData.address) && moneyIcon}
      />
    </Box>
  );
}

function AssetLine({
  label,
  labelStyle,
  sign,
  data,
  amountColor,
  iconOverride,
}: {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  sign: string;
  data: TokenDisplayData;
  amountColor?: TextColor;
  iconOverride?: React.ReactNode;
}) {
  return (
    <>
      <Text color={TextColor.Alternative} style={labelStyle}>
        {label}
      </Text>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={12}
      >
        {iconOverride || (
          <TokenIcon
            chainId={data.chainId}
            address={data.address as Hex}
            symbol={data.symbol}
          />
        )}
        <Text variant={TextVariant.DisplayMD} color={amountColor}>
          {sign}
          {data.amount} {data.symbol}
        </Text>
      </Box>
    </>
  );
}

export function TransactionDetailsHero() {
  const formatFiatPerps = useFiatFormatter({ currency: PERPS_CURRENCY });
  const formatFiatUser = useFiatFormatter();
  const { styles } = useStyles(styleSheet, {});
  const decodedAmount = useDecodedAmount();
  const { amount: claimAmount, isConverted: isClaimConverted } =
    useClaimAmount();
  const targetFiat = useTargetFiat();
  const { transactionMeta } = useTransactionDetails();
  const tokenMeta = useTokenMeta(transactionMeta);
  const isMoneyContext = useIsMoneyAccountContext();
  const sentData = useSourceSentData();
  const receivedData = useReceivedTokenData(tokenMeta);

  if (!hasTransactionType(transactionMeta, SUPPORTED_TYPES)) {
    return null;
  }

  const showTwoAssetHero =
    isMoneyContext &&
    hasTransactionType(transactionMeta, TWO_ASSET_HERO_TYPES) &&
    sentData &&
    receivedData;

  if (showTwoAssetHero) {
    const { sent, received } = resolveTwoAssetData(
      transactionMeta,
      sentData,
      receivedData,
    );
    return <TwoAssetHero sentData={sent} receivedData={received} />;
  }

  const showTokenIcon =
    hasTransactionType(transactionMeta, TOKEN_ICON_TYPES) && tokenMeta;

  if (showTokenIcon) {
    const isFiatDeposit =
      isMoneyContext &&
      hasTransactionType(transactionMeta, [
        TransactionType.moneyAccountDeposit,
      ]) &&
      Boolean(transactionMeta.metamaskPay?.fiat?.orderId);

    const icon = isMusdToken(tokenMeta.contractAddress) ? (
      <Image
        source={MoneyIcon}
        style={iconStyles.moneyIcon}
        testID="money-account-icon"
      />
    ) : (
      <TokenIcon
        chainId={tokenMeta.chainId}
        address={tokenMeta.contractAddress as Hex}
        symbol={tokenMeta.symbol}
        showNetwork={false}
      />
    );

    return (
      <Box
        testID="transaction-details-hero"
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={12}
        style={styles.container}
      >
        {icon}
        <Text
          variant={TextVariant.DisplayMD}
          color={isFiatDeposit ? TextColor.Success : undefined}
        >
          {isFiatDeposit ? '+' : ''}
          {tokenMeta.amount} {tokenMeta.symbol}
        </Text>
      </Box>
    );
  }

  const amount = targetFiat ?? claimAmount ?? decodedAmount;

  if (!amount) {
    return null;
  }

  const formatFiat = isClaimConverted ? formatFiatUser : formatFiatPerps;
  const formattedAmount = formatFiat(amount);

  return (
    <Box
      testID="transaction-details-hero"
      alignItems={AlignItems.center}
      gap={12}
      style={styles.container}
    >
      <Text variant={TextVariant.DisplayLG}>{formattedAmount}</Text>
    </Box>
  );
}

/**
 * Resolves the correct "You received" token for the two-asset hero.
 * For perpsDeposit → USDC on Arbitrum, for predictDeposit → pUSD on Polygon.
 * For everything else, falls back to the standard tokenMeta (mUSD).
 */
const RECEIVED_OVERRIDE: Partial<
  Record<TransactionType, Omit<TokenDisplayData, 'amount'>>
> = {
  [TransactionType.perpsDeposit]: {
    symbol: ARBITRUM_USDC.symbol,
    address: ARBITRUM_USDC.address,
    chainId: CHAIN_IDS.ARBITRUM as Hex,
  },
  [TransactionType.predictDeposit]: {
    symbol: POLYGON_PUSD.symbol,
    address: POLYGON_PUSD.address,
    chainId: CHAIN_IDS.POLYGON as Hex,
  },
};

function resolveTwoAssetData(
  transactionMeta: TransactionMeta,
  sentData: TokenDisplayData,
  receivedData: TokenDisplayData,
): { sent: TokenDisplayData; received: TokenDisplayData } {
  const isOutbound = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  return isOutbound
    ? { sent: receivedData, received: sentData }
    : { sent: sentData, received: receivedData };
}

function toDisplay(
  tokenMeta: NonNullable<ReturnType<typeof useTokenMeta>>,
): TokenDisplayData {
  return {
    amount: tokenMeta.amount,
    symbol: tokenMeta.symbol,
    address: tokenMeta.contractAddress,
    chainId: tokenMeta.chainId,
  };
}

function useReceivedTokenData(
  tokenMeta: ReturnType<typeof useTokenMeta>,
): TokenDisplayData | null {
  const { transactionMeta } = useTransactionDetails();
  const isMoneyContext = useIsMoneyAccountContext();

  if (isMoneyContext) {
    for (const [type, override] of Object.entries(RECEIVED_OVERRIDE)) {
      if (hasTransactionType(transactionMeta, [type as TransactionType])) {
        return { amount: tokenMeta?.amount ?? '0.00', ...override };
      }
    }
  }

  return tokenMeta ? toDisplay(tokenMeta) : null;
}

function useSourceSentData(): TokenDisplayData | null {
  const { transactionMeta } = useTransactionDetails();
  const tokenMeta = useTokenMeta(transactionMeta);
  const { metamaskPay, requiredTransactionIds } = transactionMeta;
  const { tokenAddress, chainId: sourceChainId } = metamaskPay ?? {};

  const sourceToken = useTokenWithBalance(
    (tokenAddress ?? '0x0') as Hex,
    (sourceChainId ?? '0x0') as Hex,
  );

  const childTransactions = useSelector((state: RootState) =>
    selectTransactionsByIds(state, requiredTransactionIds ?? []),
  );

  if (!tokenAddress || !sourceChainId) {
    return null;
  }

  const symbol = sourceToken?.symbol ?? MUSD_TOKEN.symbol;
  const decimals = sourceToken?.decimals ?? MUSD_DECIMALS;

  const base: Omit<TokenDisplayData, 'amount'> = {
    symbol,
    address: tokenAddress,
    chainId: sourceChainId as Hex,
  };

  const relayDeposit = childTransactions.find((tx) =>
    hasTransactionType(tx, RELAY_DEPOSIT_TYPES),
  );

  if (relayDeposit) {
    const sentAmount = extractSentAmount(
      relayDeposit,
      tokenAddress as Hex,
      sourceChainId as Hex,
      decimals,
    );

    if (sentAmount) {
      return { ...base, amount: sentAmount };
    }
  }

  const parentAmount = extractSentAmountFromParent(transactionMeta, decimals);
  if (parentAmount) {
    return { ...base, amount: parentAmount };
  }

  // Fallback: use the received mUSD amount as an approximation when
  // we have source token info but can't extract the exact sent amount
  // (e.g. complex bridge calldata that isn't a simple ERC-20 transfer).
  if (tokenMeta) {
    return { ...base, amount: tokenMeta.amount };
  }

  return null;
}

function formatAmount(num: BigNumber): string {
  if (num.isNaN() || num.isZero()) return '';
  return num.toFixed(2);
}

function extractSentAmountFromParent(
  transactionMeta: TransactionMeta,
  decimals: number,
): string | null {
  const { data } = transactionMeta.txParams ?? {};
  if (data) {
    const decodedData = parseStandardTokenTransactionData(data as string);
    const { _value: amount } = decodedData?.args ?? ({} as Result);
    if (amount) {
      const tokenAmount = calcTokenAmount(amount, decimals);
      if (tokenAmount) {
        const result = formatAmount(new BigNumber(tokenAmount));
        if (result) return result;
      }
    }
  }

  const value = transactionMeta.txParams?.value;
  if (value) {
    const result = formatAmount(new BigNumber(value as string).shiftedBy(-18));
    if (result) return result;
  }

  return null;
}

function extractSentAmount(
  relayDeposit: TransactionMeta,
  tokenAddress: Hex,
  chainId: Hex,
  decimals: number,
): string | null {
  const nativeTokenAddr = getNativeTokenAddress(chainId);
  const isNative = tokenAddress.toLowerCase() === nativeTokenAddr.toLowerCase();

  if (isNative) {
    const value = relayDeposit.txParams?.value;
    if (!value) return null;
    return formatAmount(new BigNumber(value as string).shiftedBy(-18)) || null;
  }

  const { data } = relayDeposit.txParams ?? {};
  if (!data) return null;

  const decodedData = parseStandardTokenTransactionData(data as string);
  const { _value: amount } = decodedData?.args ?? ({} as Result);
  if (!amount) return null;

  const tokenAmount = calcTokenAmount(amount, decimals);
  if (!tokenAmount) return null;

  return formatAmount(new BigNumber(tokenAmount)) || null;
}

function useTargetFiat() {
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { targetFiat } = metamaskPay ?? {};

  if (!targetFiat || targetFiat === '0') {
    return null;
  }

  return new BigNumber(targetFiat);
}

function useDecodedAmount() {
  const { transactionMeta } = useTransactionDetails();
  const { chainId } = transactionMeta;
  const { data, to } = getTokenTransferData(transactionMeta) ?? {};
  const token = useTokenWithBalance(to ?? '0x0', chainId);

  if (!to || !data) {
    return null;
  }

  const decodedData = parseStandardTokenTransactionData(data);

  const { decimals } = token ?? {};
  const { _value: amount } = decodedData?.args ?? ({} as Result);

  if (!amount || !decimals) {
    return null;
  }

  return calcTokenAmount(amount, decimals);
}

/**
 * Hook to decode the claim amount from a Merkl claim transaction
 * and convert it to the user's selected currency.
 */
function useClaimAmount(): { amount: BigNumber | null; isConverted: boolean } {
  const { transactionMeta } = useTransactionDetails();
  const { chainId } = transactionMeta;
  const { networkNativeCurrency } = useNetworkInfo(chainId);

  const conversionRate = new BigNumber(
    useSelector((state: RootState) =>
      selectConversionRateByChainId(state, chainId),
    ) ?? 0,
  );
  const currencyRates = useSelector(selectCurrencyRates);
  const usdConversionRate =
    currencyRates?.[networkNativeCurrency as string]?.usdConversionRate ?? 0;

  if (!hasTransactionType(transactionMeta, [TransactionType.musdClaim])) {
    return { amount: null, isConverted: false };
  }

  const { from } = transactionMeta.txParams ?? {};
  const claimAmountRaw = getClaimPayoutFromReceipt(
    transactionMeta.txReceipt?.logs as Parameters<
      typeof getClaimPayoutFromReceipt
    >[0],
    from as string,
  );

  if (!claimAmountRaw) {
    return { amount: null, isConverted: false };
  }

  const { fiatValue, isConverted } = convertMusdClaimAmount({
    claimAmountRaw,
    conversionRate,
    usdConversionRate,
  });

  return { amount: fiatValue, isConverted };
}

function useTokenMeta(
  transactionMeta: Parameters<typeof resolveMusdTransferMeta>[0],
): {
  amount: string;
  symbol: string;
  contractAddress: string;
  chainId: Hex;
} | null {
  const resolved = resolveMusdTransferMeta(transactionMeta);

  if (resolved) {
    const humanReadable = fromTokenMinimalUnit(
      resolved.amount,
      resolved.decimals,
      false,
    );
    const num = parseFloat(humanReadable);
    if (isNaN(num)) return null;
    return {
      amount: num.toFixed(2),
      symbol: resolved.symbol,
      contractAddress: resolved.contractAddress,
      chainId: transactionMeta.chainId as Hex,
    };
  }

  const targetFiat = transactionMeta.metamaskPay?.targetFiat;
  if (targetFiat && targetFiat !== '0') {
    const num = new BigNumber(targetFiat).toNumber();
    if (isNaN(num)) return null;
    return {
      amount: num.toFixed(2),
      symbol: MUSD_TOKEN.symbol,
      contractAddress: MUSD_TOKEN_ADDRESS,
      chainId: transactionMeta.chainId as Hex,
    };
  }

  return null;
}
