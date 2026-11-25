import React, { useMemo } from 'react';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { usePerpsLiveAccount } from '../../../../../UI/Perps/hooks/stream/usePerpsLiveAccount';
import { formatPerpsBalance } from '../../../../../UI/Perps/utils/formatUtils';
import { useLighterWithdrawableBalance } from '../../../temp-lighter/useLighterWithdrawableBalance';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import styleSheet from './perps-withdraw-balance.styles';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

function WithdrawableBalance({ balance }: { balance?: string }) {
  const { styles } = useStyles(styleSheet, {});

  // formatPerpsBalance truncates (ROUND_DOWN) to 2 decimals so the displayed
  // balance matches the Max button value and never overstates what the user
  // can actually withdraw.
  const balanceFormatted = useMemo(
    () => formatPerpsBalance(balance),
    [balance],
  );

  return (
    <Box alignItems={AlignItems.center} style={styles.container}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >{`${strings('confirm.available_balance')}${balanceFormatted}`}</Text>
    </Box>
  );
}

function HyperliquidWithdrawBalance() {
  const { account } = usePerpsLiveAccount();

  return <WithdrawableBalance balance={account?.withdrawableBalance} />;
}

function LighterWithdrawBalance() {
  const balance = useLighterWithdrawableBalance(true);

  return <WithdrawableBalance balance={balance} />;
}

export function PerpsWithdrawBalance() {
  const transactionMeta = useTransactionMetadataRequest();

  return hasTransactionType(transactionMeta, [
    TransactionType.perpsLighterWithdraw,
  ]) ? (
    <LighterWithdrawBalance />
  ) : (
    <HyperliquidWithdrawBalance />
  );
}
