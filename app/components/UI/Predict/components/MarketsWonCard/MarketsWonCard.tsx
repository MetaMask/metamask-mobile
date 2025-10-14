import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { ActivityIndicator } from 'react-native';
import { useUnrealizedPnL } from '../../hooks/useUnrealizedPnL';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

// NOTE For some reason bg-primary-default and theme.colors.primary.default displaying #8b99ff
const BUTTON_COLOR = '#4459FF';

interface MarketsWonCardProps {
  availableBalance?: number;
  totalClaimableAmount?: number;
  onClaimPress?: () => void;
  isLoading?: boolean;
  address?: string;
  providerId?: string;
}

// TODO: rename to something like `PredictPositionsHeader` (given its purpose has evolved)
const MarketsWonCard: React.FC<MarketsWonCardProps> = ({
  availableBalance,
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

  const hasClaimableAmount = totalClaimableAmount !== undefined;
  const hasAvailableBalance =
    availableBalance !== undefined && availableBalance > 0;
  const hasUnrealizedPnL = unrealizedPnL?.cashUpnl !== undefined;
  const shouldShowMainCard = hasAvailableBalance || hasUnrealizedPnL;

  return (
    <>
      {hasClaimableAmount && (
        <Box twClassName="py-2">
          <Button
            variant={ButtonVariant.Secondary}
            onPress={onClaimPress}
            twClassName="min-w-full bg-primary-default"
            style={{
              backgroundColor: BUTTON_COLOR, // TODO: update once call pull from a tw class
            }}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="gap-2"
            >
              <Text variant={TextVariant.BodyMd}>
                {strings('predict.claim_amount_text', {
                  amount: totalClaimableAmount.toFixed(2),
                })}
              </Text>
              {isLoading && (
                <ActivityIndicator size="small" color={IconColor.Alternative} />
              )}
            </Box>
          </Button>
        </Box>
      )}

      {shouldShowMainCard && (
        <Box
          twClassName="bg-muted rounded-xl pt-4 pb-2 my-4"
          testID="markets-won-card"
        >
          {hasAvailableBalance && (
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
                  {strings('predict.available_balance')}
                </Text>
              </Box>
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
                  ${availableBalance.toFixed(2)}
                </Text>
                <Icon
                  name={IconName.ArrowRight}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
                />
              </Box>
            </Box>
          )}
          {hasUnrealizedPnL && (
            <>
              <Box twClassName="h-px bg-alternative" />
              <Box
                twClassName="px-4 pb-2 mt-3"
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
                  >
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
            </>
          )}
        </Box>
      )}
    </>
  );
};

export default MarketsWonCard;
