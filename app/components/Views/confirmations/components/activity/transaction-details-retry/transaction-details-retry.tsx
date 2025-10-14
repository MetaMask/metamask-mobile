import React, { useCallback, useMemo } from 'react';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { usePerpsTrading } from '../../../../../UI/Perps/hooks';
import { noop } from 'lodash';
import { useConfirmNavigation } from '../../../hooks/useConfirmNavigation';
import Routes from '../../../../../../constants/navigation/Routes';
import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './transaction-details-retry.styles';

export function TransactionDetailsRetry() {
  const { styles } = useStyles(styleSheet, {});
  const { transactionMeta } = useTransactionDetails();
  const { status } = transactionMeta;
  const { depositWithConfirmation } = usePerpsTrading();
  const { navigateToConfirmation } = useConfirmNavigation();
  const { fiatUnformatted } = useTokenAmount({ transactionMeta });

  const amount = useMemo(
    () => new BigNumber(fiatUnformatted ?? '0').toFixed(2),
    [fiatUnformatted],
  );

  const handlePress = useCallback(async () => {
    navigateToConfirmation({
      stack: Routes.PERPS.ROOT,
      amount,
    });

    depositWithConfirmation().catch(noop);
  }, [amount, depositWithConfirmation, navigateToConfirmation]);

  if (
    status !== TransactionStatus.failed ||
    transactionMeta.type !== TransactionType.perpsDeposit
  ) {
    return null;
  }

  return (
    <Box flexDirection={FlexDirection.Column} alignItems={AlignItems.stretch}>
      <Button
        width={ButtonWidthTypes.Full}
        onPress={handlePress}
        label={strings('transaction_details.label.retry_button')}
        variant={ButtonVariants.Primary}
        style={styles.button}
      />
    </Box>
  );
}
