import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { memo } from 'react';
import PredictClaimButton from '../../../../components/PredictActionButtons/PredictClaimButton';
import PredictDetailsButtonsSkeleton from '../../../../components/PredictDetailsButtonsSkeleton';
import { PredictMarketDetailsSelectorsIDs } from '../../../../Predict.testIds';
import {
  PredictMarketStatus,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
} from '../../../../types';

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
            return (
              <Box
                flexDirection={BoxFlexDirection.Row}
                justifyContent={BoxJustifyContent.Between}
                alignItems={BoxAlignItems.Center}
                twClassName="w-full mt-4 gap-3"
              >
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  style={tw.style('flex-1 bg-success-muted')}
                  onPress={() =>
                    onBuyPress(
                      firstOpenOutcome?.tokens[0] ??
                        market?.outcomes[0].tokens[0],
                    )
                  }
                >
                  <Text
                    style={tw.style('font-bold')}
                    color={TextColor.SuccessDefault}
                  >
                    {firstOpenOutcome?.tokens[0].title} • {yesPercentage}¢
                  </Text>
                </Button>
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  style={tw.style('flex-1 bg-error-muted')}
                  onPress={() =>
                    onBuyPress(
                      firstOpenOutcome?.tokens[1] ??
                        market?.outcomes[0].tokens[1],
                    )
                  }
                >
                  <Text
                    style={tw.style('font-bold')}
                    color={TextColor.ErrorDefault}
                  >
                    {firstOpenOutcome?.tokens[1].title} • {100 - yesPercentage}¢
                  </Text>
                </Button>
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
