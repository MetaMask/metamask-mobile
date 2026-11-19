import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonSize as DSButtonSize,
  ButtonVariant as DSButtonVariant,
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
import FloatingActionButtonGlass from '../../../../../../../component-library/components-temp/ButtonGlass/FloatingActionButtonGlass';
import { useTheme } from '../../../../../../../util/theme';
import PredictClaimButton from '../../../../components/PredictActionButtons/PredictClaimButton';
import PredictDetailsButtonsSkeleton from '../../../../components/PredictDetailsButtonsSkeleton';
import { PredictMarketDetailsSelectorsIDs } from '../../../../Predict.testIds';
import {
  PredictMarketStatus,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
} from '../../../../types';
import { formatCurrencyValue } from '../../../../utils/format';
import { getDisplayBuyPrice } from '../../../../utils/prices';

const LONG_OUTCOME_LABEL_THRESHOLD = 12;
const TALL_ACTION_BUTTON_MIN_HEIGHT = 48;
const DEFAULT_PAYOUT_INVESTMENT_AMOUNT = 100;
const MIN_PAYOUT_ESTIMATE_PRICE = 0.01;
const MAX_PAYOUT_ESTIMATE_PRICE = 0.99;

const shouldUseStackedActionButtonLabel = (title?: string) =>
  Boolean(title && title.length > LONG_OUTCOME_LABEL_THRESHOLD);

const formatPayoutEstimate = (
  price: number | undefined,
  investmentAmount = DEFAULT_PAYOUT_INVESTMENT_AMOUNT,
) => {
  const investmentAmountDisplay = formatCurrencyValue(investmentAmount) ?? '--';

  if (
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price < MIN_PAYOUT_ESTIMATE_PRICE ||
    price > MAX_PAYOUT_ESTIMATE_PRICE
  ) {
    return `${investmentAmountDisplay} -> --`;
  }

  const payoutAmountDisplay =
    formatCurrencyValue(investmentAmount / price) ?? '--';

  return `${investmentAmountDisplay} -> ${payoutAmountDisplay}`;
};

const FLOATING_YES_TEXT_PROPS = { color: TextColor.SuccessInverse } as const;
const FLOATING_NO_TEXT_PROPS = { color: TextColor.ErrorInverse } as const;

export type PredictMarketDetailsActionsMode =
  | 'claim'
  | 'binary'
  | 'skeleton'
  | null;

/**
 * Which footer the market details show: claim winnings, the two buy buttons of
 * a binary (two-outcome) market, a loading skeleton, or nothing.
 */
export const getPredictMarketDetailsActionsMode = ({
  isClaimablePositionsLoading,
  hasPositivePnl,
  marketStatus,
  singleOutcomeMarket,
  isMarketLoading,
}: Pick<
  PredictMarketDetailsActionsProps,
  | 'isClaimablePositionsLoading'
  | 'hasPositivePnl'
  | 'marketStatus'
  | 'singleOutcomeMarket'
  | 'isMarketLoading'
>): PredictMarketDetailsActionsMode => {
  if (!isClaimablePositionsLoading && hasPositivePnl) return 'claim';
  if (marketStatus === PredictMarketStatus.OPEN && singleOutcomeMarket) {
    return 'binary';
  }
  if (isMarketLoading) return 'skeleton';
  return null;
};

export interface PredictMarketDetailsActionsProps {
  isClaimablePositionsLoading: boolean;
  hasPositivePnl: boolean;
  marketStatus: PredictMarketStatus | undefined;
  singleOutcomeMarket: boolean;
  isMarketLoading: boolean;
  market: PredictMarket | null;
  openOutcomes: PredictOutcome[];
  onClaimPress: () => void;
  onBuyPress: (token: PredictOutcomeToken) => void;
  isClaimPending?: boolean;
  showPayoutEstimate?: boolean;
  /**
   * Draws the binary buy buttons as glass actions floating over the content,
   * without the docked footer surface. The parent positions them.
   */
  isFloating?: boolean;
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
    onClaimPress,
    onBuyPress,
    isClaimPending = false,
    showPayoutEstimate = false,
    isFloating = false,
  }: PredictMarketDetailsActionsProps) => {
    const tw = useTailwind();
    const { colors } = useTheme();
    const mode = getPredictMarketDetailsActionsMode({
      isClaimablePositionsLoading,
      hasPositivePnl,
      marketStatus,
      singleOutcomeMarket,
      isMarketLoading,
    });

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
      if (mode === 'claim') {
        return (
          <PredictClaimButton
            onPress={onClaimPress}
            isLoading={isClaimPending}
            testID={PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON}
          />
        );
      }

      if (mode === 'binary') {
        // use openOutcomes for real-time (CLOB) prices
        const firstOpenOutcome = openOutcomes[0];
        const yesToken =
          firstOpenOutcome?.tokens?.[0] ?? market?.outcomes?.[0]?.tokens?.[0];
        const noToken =
          firstOpenOutcome?.tokens?.[1] ?? market?.outcomes?.[0]?.tokens?.[1];
        const yesTitle = yesToken?.title ?? '';
        const noTitle = noToken?.title ?? '';
        // BUY CTAs show the best ask (what the user pays), matching the outcome
        // cards and Polymarket; on wide-spread markets this differs from the mid.
        const yesBuyCents = Math.round(
          (getDisplayBuyPrice(yesToken) ?? 0) * 100,
        );
        const noBuyCents = Math.round((getDisplayBuyPrice(noToken) ?? 0) * 100);
        if (isFloating) {
          return (
            <Box
              flexDirection={BoxFlexDirection.Row}
              twClassName="w-full gap-3"
            >
              <FloatingActionButtonGlass
                isGlass
                variant={DSButtonVariant.Primary}
                size={DSButtonSize.Lg}
                tintColor={colors.success.default}
                textProps={FLOATING_YES_TEXT_PROPS}
                testID={
                  PredictMarketDetailsSelectorsIDs.FLOATING_BUY_YES_BUTTON
                }
                onPress={() => {
                  if (yesToken) {
                    onBuyPress(yesToken);
                  }
                }}
              >
                {`${yesTitle} • ${yesBuyCents}¢`}
              </FloatingActionButtonGlass>
              <FloatingActionButtonGlass
                isGlass
                variant={DSButtonVariant.Primary}
                size={DSButtonSize.Lg}
                tintColor={colors.error.default}
                textProps={FLOATING_NO_TEXT_PROPS}
                testID={PredictMarketDetailsSelectorsIDs.FLOATING_BUY_NO_BUTTON}
                onPress={() => {
                  if (noToken) {
                    onBuyPress(noToken);
                  }
                }}
              >
                {`${noTitle} • ${noBuyCents}¢`}
              </FloatingActionButtonGlass>
            </Box>
          );
        }
        const useStackedLabels =
          shouldUseStackedActionButtonLabel(yesTitle) ||
          shouldUseStackedActionButtonLabel(noTitle);
        const getActionButtonStyle = (backgroundClassName: string) =>
          tw.style(
            showPayoutEstimate ? 'w-full' : 'flex-1',
            backgroundClassName,
            { minHeight: TALL_ACTION_BUTTON_MIN_HEIGHT },
            useStackedLabels && {
              height: 'auto',
              minHeight: TALL_ACTION_BUTTON_MIN_HEIGHT,
              paddingVertical: 8,
            },
          );
        const actionColumnStyle = {
          minHeight: TALL_ACTION_BUTTON_MIN_HEIGHT,
        };
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
              {formatPayoutEstimate(getDisplayBuyPrice(token))}
            </Text>
          ) : null;
        return (
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            alignItems={BoxAlignItems.Center}
            twClassName="w-full mt-4 gap-3"
          >
            <Box twClassName="flex-1 gap-2" style={actionColumnStyle}>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                style={getActionButtonStyle('bg-success-muted')}
                label={renderActionButtonLabel({
                  title: yesTitle,
                  price: yesBuyCents,
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
            <Box twClassName="flex-1 gap-2" style={actionColumnStyle}>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                style={getActionButtonStyle('bg-error-muted')}
                label={renderActionButtonLabel({
                  title: noTitle,
                  price: noBuyCents,
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
      if (mode === 'skeleton') {
        return <PredictDetailsButtonsSkeleton />;
      }

      return null;
    })();

    if (!content) return null;

    if (isFloating && mode === 'binary') return content;

    return (
      <Box twClassName="px-3 bg-default border-t border-muted">{content}</Box>
    );
  },
);

PredictMarketDetailsActions.displayName = 'PredictMarketDetailsActions';

export default PredictMarketDetailsActions;
