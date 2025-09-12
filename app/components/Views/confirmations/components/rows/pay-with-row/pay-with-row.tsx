import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenIcon } from '../../token-icon';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { TouchableOpacity } from 'react-native';
import { useTransactionBridgeQuotes } from '../../../hooks/pay/useTransactionBridgeQuotes';
import { useTransactionRequiredFiat } from '../../../hooks/pay/useTransactionRequiredFiat';
import { Box } from '../../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './pay-with-row.styles';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';
import { BigNumber } from 'bignumber.js';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { formatAmount } from '../../../../../UI/SimulationDetails/formatAmount';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { isHardwareAccount } from '../../../../../../util/address';

export function PayWithRow() {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const { totalFiat } = useTransactionRequiredFiat({ log: true });

  const {
    txParams: { from },
  } = useTransactionMetadataRequest() ?? { txParams: {} };

  useTransactionBridgeQuotes();

  const canEdit = !isHardwareAccount(from ?? '');

  const handleClick = useCallback(() => {
    if (!canEdit) return;

    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL, {
      minimumFiatBalance: totalFiat,
    });
  }, [canEdit, navigation, totalFiat]);

  if (!payToken) {
    return (
      <Box style={styles.spinner}>
        <AnimatedSpinner size={SpinnerSize.SM} />
      </Box>
    );
  }

  const tokenBalance = formatAmount(
    I18n.locale,
    new BigNumber(payToken.balance ?? '0'),
  );

  return (
    <TouchableOpacity onPress={handleClick} disabled={!canEdit}>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
        alignItems={AlignItems.center}
        style={styles.container}
      >
        <Box flexDirection={FlexDirection.Row} gap={12}>
          <TokenIcon address={payToken.address} chainId={payToken.chainId} />
          <Box flexDirection={FlexDirection.Column}>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={6}
            >
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Default}
              >
                {strings('confirm.label.pay_with')}
              </Text>
              {canEdit && from && (
                <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
              )}
            </Box>
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {payToken.symbol}
            </Text>
          </Box>
        </Box>
        <Box
          flexDirection={FlexDirection.Column}
          alignItems={AlignItems.flexEnd}
        >
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {payToken.balanceFiat}
          </Text>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {tokenBalance} {payToken.symbol}
          </Text>
        </Box>
      </Box>
    </TouchableOpacity>
  );
}
