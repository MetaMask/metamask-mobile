import React from 'react';
import { Box } from '../../../../../UI/Box/Box';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionType } from '@metamask/transaction-controller';
import {
  hasTransactionType,
  parseStandardTokenTransactionData,
} from '../../../utils/transaction';
import { Interface, Result } from '@ethersproject/abi';
import { calcTokenAmount } from '../../../../../../util/transactions';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './transaction-details-hero.styles';
import { getTokenTransferData } from '../../../utils/transaction-pay';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { PERPS_CURRENCY } from '../../../constants/perps';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { BigNumber } from 'bignumber.js';
import { DISTRIBUTOR_CLAIM_ABI } from '../../../../../UI/Earn/components/MerklRewards/constants';

const SUPPORTED_TYPES = [
  TransactionType.musdConversion,
  TransactionType.musdClaim,
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

export function TransactionDetailsHero() {
  const formatFiat = useFiatFormatter({ currency: PERPS_CURRENCY });
  const { styles } = useStyles(styleSheet, {});
  const decodedAmount = useDecodedAmount();
  const claimAmount = useClaimAmount();
  const targetFiat = useTargetFiat();
  const { transactionMeta } = useTransactionDetails();

  if (!hasTransactionType(transactionMeta, SUPPORTED_TYPES)) {
    return null;
  }

  const amount = targetFiat ?? claimAmount ?? decodedAmount;

  if (!amount) {
    return null;
  }

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
 * Decode the claim amount from a Merkl claim transaction.
 * The claim function signature is: claim(address[] users, address[] tokens, uint256[] amounts, bytes32[][] proofs)
 * We extract the first amount from the amounts array (index 2 in the function args).
 */
function useClaimAmount() {
  const { transactionMeta } = useTransactionDetails();

  if (!hasTransactionType(transactionMeta, [TransactionType.musdClaim])) {
    return null;
  }

  const { data } = transactionMeta.txParams ?? {};

  if (!data || typeof data !== 'string') {
    return null;
  }

  try {
    const contractInterface = new Interface(DISTRIBUTOR_CLAIM_ABI);
    const decoded = contractInterface.decodeFunctionData('claim', data);

    // amounts is the 3rd parameter (index 2)
    const amounts = decoded[2];
    if (!amounts || amounts.length === 0) {
      return null;
    }

    // mUSD has 18 decimals
    const MUSD_DECIMALS = 18;
    return calcTokenAmount(amounts[0], MUSD_DECIMALS);
  } catch {
    return null;
  }
}
