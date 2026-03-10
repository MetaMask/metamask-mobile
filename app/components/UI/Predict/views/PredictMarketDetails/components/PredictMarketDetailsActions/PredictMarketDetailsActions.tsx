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

export interface PredictMarketDetailsActionsProps {
  isClaimablePositionsLoading: boolean;
  hasPositivePnl: boolean;
  marketStatus: PredictMarketStatus | undefined;
  singleOutcomeMarket: boolean;
  isMarketFetching: boolean;
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
    isMarketFetching,
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
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Lg}
                  width={ButtonWidthTypes.Full}
                  style={tw.style('flex-1 bg-success-muted')}
                  label={
                    <Text
                      style={tw.style('font-bold')}
                      color={TextColor.SuccessDefault}
                    >
                      {firstOpenOutcome?.tokens[0].title} • {yesPercentage}¢
                    </Text>
                  }
                  onPress={() =>
                    onBuyPress(
                      firstOpenOutcome?.tokens[0] ??
                        market?.outcomes[0].tokens[0],
                    )
                  }
                />
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Lg}
                  width={ButtonWidthTypes.Full}
                  style={tw.style('flex-1 bg-error-muted')}
                  label={
                    <Text
                      style={tw.style('font-bold')}
                      color={TextColor.ErrorDefault}
                    >
                      {firstOpenOutcome?.tokens[1].title} •{' '}
                      {100 - yesPercentage}¢
                    </Text>
                  }
                  onPress={() =>
                    onBuyPress(
                      firstOpenOutcome?.tokens[1] ??
                        market?.outcomes[0].tokens[1],
                    )
                  }
                />
              </Box>
            );
          }

          // Show skeleton buttons while loading
          if (isMarketFetching && !market) {
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
