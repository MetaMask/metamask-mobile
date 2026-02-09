import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import images from 'images/image-icons';
import React, { useCallback, useEffect } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import {
  USDC_SYMBOL,
  USDC_TOKEN_ICON_URL,
} from '../../../Perps/constants/hyperLiquidConfig';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { formatPrice } from '../../utils/format';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { PredictNavigationParamList } from '../../types/navigation';
import { usePredictWithdraw } from '../../hooks/usePredictWithdraw';
import { PredictEventValues } from '../../constants/eventNames';
import { POLYMARKET_PROVIDER_ID } from '../../providers/polymarket/constants';
import { HYPERLIQUID_PROVIDER_ID } from '../../providers/hyperliquid/constants';

interface PredictUnifiedBalanceProps {
  onLayout?: (height: number) => void;
}

/**
 * ProviderBalanceRow displays a single provider's balance with network badge.
 */
const ProviderBalanceRow: React.FC<{
  balance: number;
  isLoading: boolean;
  providerName: string;
  networkName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networkImage: any;
}> = ({ balance, isLoading, providerName, networkName, networkImage }) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
      alignItems={BoxAlignItems.Center}
      twClassName="py-2"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkImage}
              style={tw.style('border-background-muted')}
              name={networkName}
            />
          }
        >
          <AvatarToken
            name={USDC_SYMBOL}
            imageSource={{ uri: USDC_TOKEN_ICON_URL }}
            size={AvatarSize.Sm}
          />
        </BadgeWrapper>
        <Box>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {providerName}
          </Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {networkName}
          </Text>
        </Box>
      </Box>
      {isLoading ? (
        <Skeleton width={60} height={16} style={tw.style('rounded')} />
      ) : (
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {formatPrice(balance, { maximumDecimals: 2 })}
        </Text>
      )}
    </Box>
  );
};

/**
 * PredictUnifiedBalance shows balances from all registered prediction market providers.
 * Displays Polymarket (Polygon USDC) and Hyperliquid (Arbitrum USDC) balances
 * with network badges, and actions to add funds or withdraw.
 */
const PredictUnifiedBalance: React.FC<PredictUnifiedBalanceProps> = ({
  onLayout,
}) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  // Polymarket balance (Polygon)
  const {
    balance: polyBalance,
    isLoading: isPolyLoading,
    loadBalance: loadPolyBalance,
  } = usePredictBalance({
    providerId: POLYMARKET_PROVIDER_ID,
    loadOnMount: true,
    refreshOnFocus: true,
  });

  // Hyperliquid balance (Arbitrum)
  const {
    balance: hlBalance,
    isLoading: isHlLoading,
    loadBalance: loadHlBalance,
  } = usePredictBalance({
    providerId: HYPERLIQUID_PROVIDER_ID,
    loadOnMount: true,
    refreshOnFocus: true,
  });

  const { deposit, isDepositPending } = usePredictDeposit();
  const { withdraw } = usePredictWithdraw();
  const { executeGuardedAction } = usePredictActionGuard({
    providerId: POLYMARKET_PROVIDER_ID,
    navigation,
  });

  const isLoading = isPolyLoading && isHlLoading;
  const totalBalance = polyBalance + hlBalance;
  const hasBalance = totalBalance > 0;

  useEffect(() => {
    if (!isDepositPending) {
      loadPolyBalance({ isRefresh: true });
      loadHlBalance({ isRefresh: true });
    }
  }, [isDepositPending, loadPolyBalance, loadHlBalance]);

  const handleAddFunds = useCallback(() => {
    executeGuardedAction(
      () => {
        deposit({
          analyticsProperties: {
            entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
          },
        });
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.DEPOSIT },
    );
  }, [deposit, executeGuardedAction]);

  const handleWithdraw = useCallback(() => {
    withdraw();
  }, [withdraw]);

  if (isLoading) {
    return (
      <Box
        twClassName="bg-muted rounded-xl p-4 mx-4 gap-3"
        testID="predict-unified-balance-skeleton"
      >
        <Skeleton width={160} height={20} style={tw.style('rounded')} />
        <Box twClassName="gap-2">
          <Skeleton width="100%" height={40} style={tw.style('rounded')} />
          <Skeleton width="100%" height={40} style={tw.style('rounded')} />
        </Box>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          <Skeleton
            width="50%"
            height={40}
            style={tw.style('rounded-xl flex-1')}
          />
          <Skeleton
            width="50%"
            height={40}
            style={tw.style('rounded-xl flex-1')}
          />
        </Box>
      </Box>
    );
  }

  return (
    <>
      {isDepositPending && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="bg-muted rounded-t-xl p-4 mx-4 border-b border-muted"
        >
          <Text variant={TextVariant.BodySm}>
            {strings('predict.deposit.adding_your_funds')}
          </Text>
          <Spinner />
        </Box>
      )}
      <Box
        style={tw.style(
          'bg-muted p-4 mx-4 gap-3 rounded-xl',
          isDepositPending ? 'rounded-t-none' : 'rounded-t-xl',
        )}
        testID="predict-unified-balance-card"
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          onLayout?.(height);
        }}
      >
        {/* Header */}
        <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Bold}>
          {strings('predict.trading_balances')}
        </Text>

        {/* Provider balance rows */}
        <Box twClassName="gap-1">
          <ProviderBalanceRow
            balance={polyBalance}
            isLoading={isPolyLoading}
            providerName={strings('predict.polymarket_provider')}
            networkName={strings('predict.polygon_network')}
            networkImage={images.POL}
          />
          <ProviderBalanceRow
            balance={hlBalance}
            isLoading={isHlLoading}
            providerName={strings('predict.hyperliquid_provider')}
            networkName={strings('predict.arbitrum_network')}
            networkImage={images.AETH}
          />
        </Box>

        {/* Action buttons */}
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          <Button
            variant={
              hasBalance ? ButtonVariants.Secondary : ButtonVariants.Primary
            }
            style={tw.style('flex-1')}
            label={strings('predict.deposit.add_funds')}
            onPress={handleAddFunds}
          />
          {hasBalance && (
            <Button
              variant={ButtonVariants.Secondary}
              style={tw.style('flex-1')}
              label={strings('predict.deposit.withdraw')}
              onPress={handleWithdraw}
            />
          )}
        </Box>
      </Box>
    </>
  );
};

export default PredictUnifiedBalance;
