import React, { ReactNode, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenIcon } from '../../token-icon';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { TouchableOpacity } from 'react-native';
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
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { isHardwareAccount } from '../../../../../../util/address';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { useTransactionPayFiat } from '../../../hooks/pay/useTransactionPayFiat';

export function PayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const { formatFiat } = useTransactionPayFiat();
  const { styles } = useStyles(styleSheet, {});

  const {
    txParams: { from },
  } = useTransactionMetadataRequest() ?? { txParams: {} };

  const canEdit = !isHardwareAccount(from ?? '');

  const handleClick = useCallback(() => {
    if (!canEdit) return;

    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [canEdit, navigation]);

  const balanceUsdFormatted = useMemo(
    () => formatFiat(new BigNumber(payToken?.balanceFiat ?? '0')),
    [formatFiat, payToken?.balanceFiat],
  );

  if (!payToken) {
    return <PayWithRowSkeleton />;
  }

  return (
    <TouchableOpacity onPress={handleClick} disabled={!canEdit}>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.center}
        gap={8}
        style={styles.container}
      >
        <TokenIcon address={payToken.address} chainId={payToken.chainId} />
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {`${strings('confirm.label.pay_with')} ${payToken.symbol}`}
        </Text>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
          •
        </Text>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
          {balanceUsdFormatted}
        </Text>
        {canEdit && from && (
          <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
        )}
      </Box>
    </TouchableOpacity>
  );
}

export function PayWithRowSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box testID="pay-with-row-skeleton">
      <ListItem
        icon={<Skeleton height={38} width={38} style={styles.skeletonCircle} />}
        leftPrimary={
          <Skeleton height={18} width={70} style={styles.skeletonTop} />
        }
        leftAlternate={
          <Skeleton height={18} width={70} style={styles.skeleton} />
        }
        rightPrimary={
          <Skeleton height={18} width={70} style={styles.skeletonTop} />
        }
        rightAlternate={
          <Skeleton height={18} width={70} style={styles.skeleton} />
        }
      />
    </Box>
  );
}

function ListItem({
  icon,
  leftAlternate,
  leftPrimary,
  rightAlternate,
  rightPrimary,
}: {
  icon: ReactNode;
  leftAlternate: ReactNode;
  leftPrimary: ReactNode;
  rightAlternate: ReactNode;
  rightPrimary: ReactNode;
}) {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.spaceBetween}
      alignItems={AlignItems.center}
      style={styles.container}
    >
      <Box flexDirection={FlexDirection.Row} gap={12}>
        {icon}
        <Box flexDirection={FlexDirection.Column}>
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={6}
          >
            {leftPrimary}
          </Box>
          {leftAlternate}
        </Box>
      </Box>
      <Box flexDirection={FlexDirection.Column} alignItems={AlignItems.flexEnd}>
        {rightPrimary}
        {rightAlternate}
      </Box>
    </Box>
  );
}
