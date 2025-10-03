import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { useUnrealizedPnL } from '../../hooks/useUnrealizedPnL';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

interface MarketsWonCardProps {
  numberOfMarketsWon?: number;
  totalClaimableAmount?: number;
  onClaimPress?: () => void;
  isLoading?: boolean;
  address?: string;
  providerId?: string;
}

const MarketsWonCard: React.FC<MarketsWonCardProps> = ({
  numberOfMarketsWon,
  totalClaimableAmount,
  onClaimPress,
  isLoading,
  address,
  providerId,
}) => {
  const { unrealizedPnL, isFetching: isUnrealizedPnLFetching } =
    useUnrealizedPnL({
      address,
      providerId,
    });

  // Use data from the hook, with fallback values
  const unrealizedAmount = unrealizedPnL?.cashUpnl ?? 0;
  const unrealizedPercent = unrealizedPnL?.percentUpnl ?? 0;
  const formatAmount = (amount: number) => {
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(amount).toFixed(2)}`;
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  const showWonMarketsRow =
    numberOfMarketsWon !== undefined && numberOfMarketsWon > 0;

  return (
    <Box twClassName="bg-muted rounded-xl py-4 my-4" testID="markets-won-card">
      {/* Won Markets Row - Conditionally shown */}
      {showWonMarketsRow && (
        <>
          <Box
            twClassName="px-4 mb-3"
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Text
                variant={TextVariant.BodyMd}
                twClassName="text-alternative"
                testID="markets-won-count"
              >
                {numberOfMarketsWon === 1
                  ? strings('predict.won_markets_text_singular', {
                      count: numberOfMarketsWon,
                    })
                  : strings('predict.won_markets_text_plural', {
                      count: numberOfMarketsWon,
                    })}
              </Text>
            </Box>
            {totalClaimableAmount !== undefined && onClaimPress && (
              <TouchableOpacity onPress={onClaimPress}>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="flex-row items-center"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="text-primary mr-1"
                    testID="claimable-amount"
                  >
                    {strings('predict.claim_amount_text', {
                      amount: totalClaimableAmount.toFixed(2),
                    })}
                  </Text>
                  {isLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={IconColor.Alternative}
                    />
                  ) : (
                    <Icon
                      name={IconName.ArrowRight}
                      size={IconSize.Sm}
                      color={IconColor.Alternative}
                    />
                  )}
                </Box>
              </TouchableOpacity>
            )}
          </Box>

          {/* Separator line */}
          <Box twClassName="h-px bg-alternative mb-3" />
        </>
      )}

      {/* Unrealized P&L Row - Always shown */}
      <Box
        twClassName="px-4"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('predict.unrealized_pnl_label')}
          </Text>
        </Box>
        {isUnrealizedPnLFetching ? (
          <Skeleton height={20} width={100} />
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            twClassName={
              unrealizedAmount >= 0
                ? 'text-success-default'
                : 'text-error-default'
            }
          >
            {strings('predict.unrealized_pnl_value', {
              amount: formatAmount(unrealizedAmount),
              percent: formatPercent(unrealizedPercent),
            })}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default MarketsWonCard;
