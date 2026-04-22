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
  formatPerpsFiat,
  parseCurrencyString,
} from '../../../../../UI/Perps/utils/formatUtils';
import styleSheet from './perps-withdraw-balance.styles';

export function PerpsWithdrawBalance() {
  const { styles } = useStyles(styleSheet, {});
  const { account } = usePerpsLiveAccount();

  const balanceFormatted = useMemo(() => {
    if (!account?.availableBalance) return formatPerpsFiat(0);
    return formatPerpsFiat(parseCurrencyString(account.availableBalance));
  }, [account?.availableBalance]);

  return (
    <Box alignItems={AlignItems.center} style={styles.container}>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Alternative}
      >{`${strings('confirm.available_balance')}${balanceFormatted}`}</Text>
    </Box>
  );
}
