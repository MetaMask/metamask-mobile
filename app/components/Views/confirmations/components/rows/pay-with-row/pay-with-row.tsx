import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenIcon } from '../../token-icon';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useWithdrawalToken } from '../../../hooks/pay/useWithdrawalToken';
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
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../ConfirmationView.testIds';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { POLYGON_USDCE } from '../../../constants/predict';

/** Default withdrawal token shown when no payment token is selected */
const DEFAULT_WITHDRAWAL_TOKEN = {
  address: POLYGON_USDCE.address,
  chainId: CHAIN_IDS.POLYGON,
  symbol: POLYGON_USDCE.symbol,
};

export function PayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const { isWithdrawal } = useWithdrawalToken();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { styles } = useStyles(styleSheet, {});
  const { setConfirmationMetric } = useConfirmationMetricEvents();

  const {
    txParams: { from },
  } = useTransactionMetadataRequest() ?? { txParams: {} };

  const canEdit = !isHardwareAccount(from ?? '');

  const handleClick = useCallback(() => {
    if (!canEdit) return;
    setConfirmationMetric({
      properties: {
        mm_pay_token_list_opened: true,
      },
    });
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [canEdit, navigation, setConfirmationMetric]);

  const label = isWithdrawal
    ? strings('confirm.label.receive_as')
    : strings('confirm.label.pay_with');

  // For withdrawals, show the default token (Polygon USDC.E) if no token is selected.
  // Auto-selection is disabled for withdrawals, so payToken will be undefined until user selects.
  const displayToken = useMemo(() => {
    if (isWithdrawal) {
      return payToken ?? DEFAULT_WITHDRAWAL_TOKEN;
    }
    return payToken ?? null;
  }, [isWithdrawal, payToken]);

  // For deposits, show the user's balance of the selected pay token
  const balanceUsdFormatted = useMemo(
    () => formatFiat(new BigNumber(payToken?.balanceUsd ?? '0')),
    [formatFiat, payToken?.balanceUsd],
  );

  if (!displayToken) {
    return <PayWithRowSkeleton />;
  }

  return (
    <TouchableOpacity
      onPress={handleClick}
      disabled={!canEdit}
      testID={ConfirmationRowComponentIDs.PAY_WITH}
    >
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.center}
        gap={12}
        style={styles.container}
      >
        <TokenIcon
          address={displayToken.address}
          chainId={displayToken.chainId}
        />
        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Default}
          testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
        >
          {`${label} ${displayToken.symbol}`}
        </Text>
        {/* For deposits, show the user's balance; for withdrawals, no balance needed */}
        {!isWithdrawal && (
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
            testID={TransactionPayComponentIDs.PAY_WITH_BALANCE}
          >
            {balanceUsdFormatted}
          </Text>
        )}
        {canEdit && from && (
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={IconColor.Alternative}
          />
        )}
      </Box>
    </TouchableOpacity>
  );
}

export function PayWithRowSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box
      testID="pay-with-row-skeleton"
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      justifyContent={JustifyContent.center}
      gap={8}
      style={styles.container}
    >
      <Skeleton height={32} width={32} style={styles.skeletonCircle} />
      <Skeleton height={18} width={100} style={styles.skeletonTop} />
      <Skeleton height={18} width={100} style={styles.skeletonTop} />
    </Box>
  );
}
