import React from 'react';
import { type Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { Box } from '../../../Box/Box';
import { AlignItems, FlexDirection } from '../../../Box/box.types';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import {
  TokenIcon,
} from '../../../../Views/confirmations/components/token-icon';
import { resolveMusdTransferMeta } from '../../constants/activityStyles';
import { fromTokenMinimalUnit } from '../../../../../util/number/bigint';
import { MUSD_TOKEN, MUSD_TOKEN_ADDRESS } from '../../../Earn/constants/musd';

/**
 * Resolves the mUSD numeric amount for the hero display.
 * - Withdrawals: decodes from ERC-20 transfer calldata via resolveMusdTransferMeta
 * - Deposits: uses metamaskPay.targetFiat (since mUSD is pegged 1:1 to USD)
 */
function useMusdHeroData(transactionMeta: Parameters<typeof resolveMusdTransferMeta>[0]): {
  amount: string;
  symbol: string;
  contractAddress: string;
  chainId: Hex;
} | null {
  const tokenMeta = resolveMusdTransferMeta(transactionMeta);

  if (tokenMeta) {
    const humanReadable = fromTokenMinimalUnit(
      tokenMeta.amount,
      tokenMeta.decimals,
      false,
    );
    const num = parseFloat(humanReadable);
    if (isNaN(num)) return null;
    const formatted = num.toFixed(2);
    return {
      amount: formatted,
      symbol: tokenMeta.symbol,
      contractAddress: tokenMeta.contractAddress,
      chainId: transactionMeta.chainId as Hex,
    };
  }

  const targetFiat = transactionMeta.metamaskPay?.targetFiat;
  if (targetFiat && targetFiat !== '0') {
    const num = new BigNumber(targetFiat).toNumber();
    if (isNaN(num)) return null;
    const formatted = num.toFixed(2);
    return {
      amount: formatted,
      symbol: MUSD_TOKEN.symbol,
      contractAddress: MUSD_TOKEN_ADDRESS,
      chainId: transactionMeta.chainId as Hex,
    };
  }

  return null;
}

export function MoneyTransactionDetailsHero() {
  const { transactionMeta } = useTransactionDetails();
  const heroData = useMusdHeroData(transactionMeta);

  if (!heroData) {
    return null;
  }

  return (
    <Box
      testID="money-transaction-details-hero"
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={12}
      style={{ marginVertical: 12 }}
    >
      <TokenIcon
        chainId={heroData.chainId}
        address={heroData.contractAddress as Hex}
        symbol={heroData.symbol}
        showNetwork={false}
      />
      <Text variant={TextVariant.DisplayMD} style={{ fontWeight: '700' }}>
        {heroData.amount} {heroData.symbol}
      </Text>
    </Box>
  );
}
