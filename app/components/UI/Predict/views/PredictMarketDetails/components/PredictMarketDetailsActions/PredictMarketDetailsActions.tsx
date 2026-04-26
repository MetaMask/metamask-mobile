import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { memo } from 'react';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../../component-library/components/Buttons/Button';
import PredictClaimButton from '../../../../components/PredictActionButtons/PredictClaimButton';
import PredictDetailsButtonsSkeleton from '../../../../components/PredictDetailsButtonsSkeleton';
import { PredictMarketDetailsSelectorsIDs } from '../../../../Predict.testIds';
import {
  PredictMarketStatus,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
} from '../../../../types';

const LONG_OUTCOME_LABEL_THRESHOLD = 12;
const TALL_ACTION_BUTTON_MIN_HEIGHT = 48;
const DEFAULT_PAYOUT_INVESTMENT_AMOUNT = 100;

const shouldUseStackedActionButtonLabel = (title?: string) =>
  Boolean(title && title.length > LONG_OUTCOME_LABEL_THRESHOLD);

const formatUsdAmount = (value: number) => {
  const [whole, decimals] = value.toFixed(2).split('.');
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimals}`;
};

const formatPayoutEstimate = (
  price: number | undefined,
  investmentAmount = DEFAULT_PAYOUT_INVESTMENT_AMOUNT,
) => {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return `${formatUsdAmount(investmentAmount)} -> --`;
  }

  return `${formatUsdAmount(investmentAmount)} -> ${formatUsdAmount(
    investmentAmount / price,
  )}`;
};

export interface PredictMarketDetailsActionsProps {
  isClaimablePositionsLoading: boolean;
  hasPositivePnl: boolean;
  marketStatus: PredictMarketStatus | undefined;
  singleOutcomeMarket: boolean;
  isMarketLoading: boolean;
  market: PredictMarket | null;
  openOutcomes: PredictOutcome[];
  yesPercentage: number;
  onClaimPress: () => void;
  onBuyPress: (token: PredictOutcomeToken) => void;
  isClaimPending?: boolean;
  showPayoutEstimate?: boolean;
}

const PredictMarketDetailsActions = memo(
  ({
    isClaimablePositionsLoading,
    hasPositivePnl,
    marketStatus,
    singleOutcomeMarket,
    isMarketLoading,
    market,
    openOutcomes,
    yesPercentage,
    onClaimPress,
    onBuyPress,
    isClaimPending = false,
    showPayoutEstimate = false,
  }: PredictMarketDetailsActionsProps) => {
    const tw = useTailwind();

    const renderActionButtonLabel = ({
      title,
      price,
      color,
      useStackedLabels,
    }: {
      title: string;
      price: number;
      color: TextColor;
      useStackedLabels: boolean;
    }) => {
      if (useStackedLabels) {
        return (
          <Box twClassName="w-full items-center py-0.5">
            <Text
              style={tw.style('font-bold text-center')}
              color={color}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            <Text style={tw.style('font-bold text-center')} color={color}>
              {price}¢
            </Text>
          </Box>
        );
      }

      return (
        <Text style={tw.style('font-bold text-center')} color={color}>
          {title} • {price}¢
        </Text>
      );
    };

    return (
      <>
        {(() => {
          if (!isClaimablePositionsLoading && hasPositivePnl) {
            return (
              <PredictClaimButton
                onPress={onClaimPress}
                isLoading={isClaimPending}
                testID={PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON}
              />
            );
          }

          if (
            marketStatus === PredictMarketStatus.OPEN &&
            singleOutcomeMarket
          ) {
            // use openOutcomes for real-time (CLOB) prices
            const firstOpenOutcome = openOutcomes[0];
            const yesToken =
              firstOpenOutcome?.tokens?.[0] ??
              market?.outcomes?.[0]?.tokens?.[0];
            const noToken =
              firstOpenOutcome?.tokens?.[1] ??
              market?.outcomes?.[0]?.tokens?.[1];
            const yesTitle = yesToken?.title ?? '';
            const noTitle = noToken?.title ?? '';
            const useStackedLabels =
              shouldUseStackedActionButtonLabel(yesTitle) ||
              shouldUseStackedActionButtonLabel(noTitle);
            const getActionButtonStyle = (backgroundClassName: string) =>
              tw.style(
                showPayoutEstimate ? 'w-full' : 'flex-1',
                backgroundClassName,
                useStackedLabels && {
                  height: 'auto',
                  minHeight: TALL_ACTION_BUTTON_MIN_HEIGHT,
                  paddingVertical: 8,
                },
              );
            const renderPayoutEstimate = (
              token: PredictOutcomeToken | undefined,
              color: TextColor,
            ) =>
              showPayoutEstimate ? (
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={color}
                  twClassName="text-center"
                >
                  {formatPayoutEstimate(token?.price)}
                </Text>
              ) : null;
            return (
              <Box
                flexDirection={BoxFlexDirection.Row}
                justifyContent={BoxJustifyContent.Between}
                alignItems={BoxAlignItems.Center}
                twClassName="w-full mt-4 gap-3"
              >
                <Box twClassName="flex-1 gap-2">
                  <Button
                    variant={ButtonVariants.Secondary}
                    size={ButtonSize.Lg}
                    width={ButtonWidthTypes.Full}
                    style={getActionButtonStyle('bg-success-muted')}
                    label={renderActionButtonLabel({
                      title: yesTitle,
                      price: yesPercentage,
                      color: TextColor.SuccessDefault,
                      useStackedLabels,
                    })}
                    onPress={() => {
                      if (yesToken) {
                        onBuyPress(yesToken);
                      }
                    }}
                  />
                  {renderPayoutEstimate(yesToken, TextColor.SuccessDefault)}
                </Box>
                <Box twClassName="flex-1 gap-2">
                  <Button
                    variant={ButtonVariants.Secondary}
                    size={ButtonSize.Lg}
                    width={ButtonWidthTypes.Full}
                    style={getActionButtonStyle('bg-error-muted')}
                    label={renderActionButtonLabel({
                      title: noTitle,
                      price: 100 - yesPercentage,
                      color: TextColor.ErrorDefault,
                      useStackedLabels,
                    })}
                    onPress={() => {
                      if (noToken) {
                        onBuyPress(noToken);
                      }
                    }}
                  />
                  {renderPayoutEstimate(noToken, TextColor.ErrorDefault)}
                </Box>
              </Box>
            );
          }

          // Show skeleton buttons while loading
          if (isMarketLoading) {
            return <PredictDetailsButtonsSkeleton />;
          }

          return null;
        })()}
      </>
    );
  },
);

PredictMarketDetailsActions.displayName = 'PredictMarketDetailsActions';

export default PredictMarketDetailsActions;
