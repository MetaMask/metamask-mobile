import React, { useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { usePerpsLiveAccount } from '../../../../../UI/Perps/hooks/stream/usePerpsLiveAccount';
import {
  formatPerpsBalance,
  parseCurrencyString,
  truncateToTwoDecimals,
} from '../../../../../UI/Perps/utils/formatUtils';
import styleSheet from './perps-withdraw-balance.styles';

export function PerpsWithdrawBalance() {
  const { styles } = useStyles(styleSheet, {});
  const { account } = usePerpsLiveAccount();

  const availableBalance = useMemo(() => {
    const balance =
      account?.availableToTradeBalance ?? account?.availableBalance;
    if (!balance) return 0;
    return truncateToTwoDecimals(parseCurrencyString(balance));
  }, [account?.availableBalance, account?.availableToTradeBalance]);

  return (
    <Box alignItems={AlignItems.center} style={styles.container}>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Alternative}
      >{`${strings('confirm.available_balance')}${formatPerpsBalance(availableBalance)}`}</Text>
    </Box>
  );
}
