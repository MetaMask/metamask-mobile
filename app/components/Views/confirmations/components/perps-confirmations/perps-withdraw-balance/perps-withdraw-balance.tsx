import React, { useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { usePerpsLiveAccount } from '../../../../../UI/Perps/hooks/stream/usePerpsLiveAccount';
import { formatPerpsBalance } from '../../../../../UI/Perps/utils/formatUtils';
import styleSheet from './perps-withdraw-balance.styles';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

export function PerpsWithdrawBalance() {
  const { styles } = useStyles(styleSheet, {});
  const { account } = usePerpsLiveAccount();

  // formatPerpsBalance truncates (ROUND_DOWN) to 2 decimals so the displayed
  // balance matches the Max button value and never overstates what the user
  // can actually withdraw.
  const balanceFormatted = useMemo(
    () => formatPerpsBalance(account?.withdrawableBalance),
    [account?.withdrawableBalance],
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
