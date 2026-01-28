import React, { useMemo } from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { TooltipContentProps } from './types';
import createStyles from './FeesTooltipContent.styles';
import { formatPerpsFiat } from '../../../utils/formatUtils';
import Engine from '../../../../../../core/Engine';
import {
  HYPERLIQUID_ASSET_CONFIGS,
  METAMASK_WITHDRAWAL_FEE_PLACEHOLDER,
} from '../../../constants/hyperLiquidConfig';
import { WITHDRAWAL_CONSTANTS } from '../../../constants/perpsConfig';

const WithdrawalFeesTooltipContent: React.FC<TooltipContentProps> = ({
  testID,
}) => {
  const { styles } = useStyles(createStyles, {});

  // Get withdrawal route to access fee constraints
  const withdrawalRoute = useMemo(() => {
    const controller = Engine.context.PerpsController;
    const routes = controller.getWithdrawalRoutes();
    const isTestnet = controller.state.isTestnet;

    // Find USDC route
    const usdcAssetId = isTestnet
      ? HYPERLIQUID_ASSET_CONFIGS.usdc.testnet
      : HYPERLIQUID_ASSET_CONFIGS.usdc.mainnet;

    return routes.find((route) => route.assetId === usdcAssetId);
  }, []);

  // Get the actual network fee amount from route and format using existing utility
  const networkFee = useMemo(() => {
    const fee =
      withdrawalRoute?.constraints?.fees?.fixed ??
      WITHDRAWAL_CONSTANTS.DefaultFeeAmount;
    return formatPerpsFiat(fee);
  }, [withdrawalRoute]);

  // Calculate total fees for display
  const totalFees = useMemo(() => {
    const providerFee =
      withdrawalRoute?.constraints?.fees?.fixed ??
      WITHDRAWAL_CONSTANTS.DefaultFeeAmount;
    // MetaMask fee is currently 0
    const metamaskFee = 0;
    return formatPerpsFiat(providerFee + metamaskFee);
  }, [withdrawalRoute]);

  return (
    <View testID={testID}>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.contentText}
      >
        {strings('perps.tooltips.withdrawal_fees.content')}
      </Text>
      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('perps.tooltips.fees.provider_fee')}
        </Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {networkFee}
        </Text>
      </View>
      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('perps.tooltips.fees.metamask_fee')}
        </Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {METAMASK_WITHDRAWAL_FEE_PLACEHOLDER}
        </Text>
      </View>
      <View style={styles.totalRow}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {strings('perps.tooltips.fees.total')}
        </Text>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {totalFees}
        </Text>
      </View>
    </View>
  );
};

export default React.memo(WithdrawalFeesTooltipContent);
