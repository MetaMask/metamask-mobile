import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { TooltipContentProps } from './types';
import createStyles from './FeesTooltipContent.styles';
import { formatPerpsFiat } from '../../../utils/formatUtils';
import { useSelector } from 'react-redux';
import { useWithdrawalRoute } from '../../../hooks/useWithdrawValidation';
import { selectPerpsOrderProvider } from '../../../selectors/perpsController';
import { METAMASK_WITHDRAWAL_FEE_PLACEHOLDER } from '../../../constants/perpsUIConfig';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

const WithdrawalFeesTooltipContent: React.FC<TooltipContentProps> = ({
  testID,
}) => {
  const { styles } = useStyles(createStyles, {});

  const providerId = useSelector(selectPerpsOrderProvider) ?? undefined;
  const withdrawalRoute = useWithdrawalRoute(providerId);

  // MetaMask fee is currently 0, so the total equals the route's provider fee.
  // An unknown fee renders the Core placeholder.
  const networkFee = useMemo(
    () => formatPerpsFiat(withdrawalRoute?.constraints?.fees?.fixed),
    [withdrawalRoute],
  );

  return (
    <View testID={testID}>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        style={styles.contentText}
      >
        {strings('perps.tooltips.withdrawal_fees.content')}
      </Text>
      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.tooltips.fees.provider_fee')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {networkFee}
        </Text>
      </View>
      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.tooltips.fees.metamask_fee')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {METAMASK_WITHDRAWAL_FEE_PLACEHOLDER}
        </Text>
      </View>
      <View style={styles.totalRow}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {strings('perps.tooltips.fees.total')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {networkFee}
        </Text>
      </View>
    </View>
  );
};

export default React.memo(WithdrawalFeesTooltipContent);
