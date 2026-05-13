import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
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

const shouldUseStackedActionButtonLabel = (title?: string) =>
  Boolean(title && title.length > LONG_OUTCOME_LABEL_THRESHOLD);

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

    const content = (() => {
      if (!isClaimablePositionsLoading && hasPositivePnl) {
        return (
          <PredictClaimButton
            onPress={onClaimPress}
            isLoading={isClaimPending}
            testID={PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON}
          />
        );
      }

      if (marketStatus === PredictMarketStatus.OPEN && singleOutcomeMarket) {
        const firstOpenOutcome = openOutcomes[0];
        const yesToken =
          firstOpenOutcome?.tokens?.[0] ?? market?.outcomes?.[0]?.tokens?.[0];
        const noToken =
          firstOpenOutcome?.tokens?.[1] ?? market?.outcomes?.[0]?.tokens?.[1];
        const yesTitle = yesToken?.title ?? '';
        const noTitle = noToken?.title ?? '';
        const useStackedLabels =
          shouldUseStackedActionButtonLabel(yesTitle) ||
          shouldUseStackedActionButtonLabel(noTitle);
        const getActionButtonStyle = (backgroundClassName: string) =>
          tw.style(
            'flex-1',
            backgroundClassName,
            useStackedLabels && {
              height: 'auto',
              minHeight: TALL_ACTION_BUTTON_MIN_HEIGHT,
              paddingVertical: 8,
            },
          );
        return (
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            alignItems={BoxAlignItems.Center}
            twClassName="w-full mt-4 gap-3"
          >
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
          </Box>
        );
      }

      if (isMarketLoading) {
        return <PredictDetailsButtonsSkeleton />;
      }

      return null;
    })();

    if (!content) return null;

    return (
      <Box twClassName="px-3 bg-default border-t border-muted">{content}</Box>
    );
  },
);

PredictMarketDetailsActions.displayName = 'PredictMarketDetailsActions';

export default PredictMarketDetailsActions;
