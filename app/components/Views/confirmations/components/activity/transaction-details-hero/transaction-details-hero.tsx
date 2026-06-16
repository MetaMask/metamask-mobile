import React from 'react';
import { useSelector } from 'react-redux';
import { type Hex } from '@metamask/utils';
import { Box } from '../../../../../UI/Box/Box';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionType } from '@metamask/transaction-controller';
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
import { PERPS_CURRENCY } from '../../../constants/perps';
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
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
} from '../../../../../UI/Earn/constants/musd';

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

  if (!hasTransactionType(transactionMeta, SUPPORTED_TYPES)) {
    return null;
  }

  const showTokenIcon =
    hasTransactionType(transactionMeta, TOKEN_ICON_TYPES) && tokenMeta;

  if (showTokenIcon) {
    return (
      <Box
        testID="transaction-details-hero"
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={12}
        style={styles.container}
      >
        <TokenIcon
          chainId={tokenMeta.chainId}
          address={tokenMeta.contractAddress as Hex}
          symbol={tokenMeta.symbol}
          showNetwork={false}
        />
        <Text variant={TextVariant.DisplayMD}>
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
