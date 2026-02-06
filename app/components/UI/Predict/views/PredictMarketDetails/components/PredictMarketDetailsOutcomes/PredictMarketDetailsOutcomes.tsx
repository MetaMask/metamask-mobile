import React, { memo, useState } from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../../util/theme';
import PredictMarketOutcome from '../../../../components/PredictMarketOutcome';
import PredictMarketOutcomeResolved from '../../../../components/PredictMarketOutcomeResolved';
import {
  PredictMarketStatus,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
} from '../../../../types';
import type { PredictEntryPoint } from '../../../../types/navigation';

export interface PredictMarketDetailsOutcomesProps {
  market: PredictMarket | null;
  marketStatus: PredictMarketStatus | undefined;
  singleOutcomeMarket: boolean;
  multipleOutcomes: boolean;
  multipleOpenOutcomesPartiallyResolved: boolean;
  winningOutcome: PredictOutcome | undefined;
  losingOutcome: PredictOutcome | undefined;
  winningOutcomeToken: PredictOutcomeToken | undefined;
  losingOutcomeToken: PredictOutcomeToken | undefined;
  openOutcomes: PredictOutcome[];
  closedOutcomes: PredictOutcome[];
  entryPoint: string | undefined;
}

const PredictMarketDetailsOutcomes = memo(
  ({
    market,
    marketStatus,
    singleOutcomeMarket,
    multipleOutcomes,
    multipleOpenOutcomesPartiallyResolved,
    winningOutcome,
    losingOutcome,
    winningOutcomeToken,
    losingOutcomeToken,
    openOutcomes,
    closedOutcomes,
    entryPoint,
  }: PredictMarketDetailsOutcomesProps) => {
    const [isResolvedExpanded, setIsResolvedExpanded] =
      useState<boolean>(false);
    const tw = useTailwind();
    const { colors } = useTheme();

    if (!market) {
      return <Box />;
    }

    // Closed market with single outcome (binary)
    if (marketStatus === PredictMarketStatus.CLOSED && singleOutcomeMarket) {
      return (
        <Box>
          {winningOutcome && (
            <PredictMarketOutcome
              market={market}
              outcome={winningOutcome}
              outcomeToken={winningOutcomeToken}
              isClosed
            />
          )}
          {losingOutcome && (
            <PredictMarketOutcome
              market={market}
              outcome={losingOutcome}
              outcomeToken={losingOutcomeToken}
              isClosed
            />
          )}
        </Box>
      );
    }

    // Closed market with multiple outcomes
    if (marketStatus === PredictMarketStatus.CLOSED && multipleOutcomes) {
      return closedOutcomes.map((outcome) => (
        <PredictMarketOutcomeResolved key={outcome.id} outcome={outcome} />
      ));
    }

    // Open market with partially resolved outcomes
    if (
      marketStatus === PredictMarketStatus.OPEN &&
      multipleOutcomes &&
      multipleOpenOutcomesPartiallyResolved
    ) {
      return (
        <Box>
          {openOutcomes.map((outcome) => (
            <PredictMarketOutcome
              key={outcome.id}
              market={market}
              outcome={outcome}
              entryPoint={entryPoint as PredictEntryPoint | undefined}
            />
          ))}
          <Pressable
            onPress={() => setIsResolvedExpanded((prev) => !prev)}
            style={({ pressed }) =>
              tw.style(
                'w-full rounded-xl bg-default px-4 py-3 mt-2 mb-4 bg-muted',
                pressed && 'bg-pressed',
              )
            }
            accessibilityRole="button"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="gap-3"
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-2"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="font-medium"
                  color={TextColor.TextDefault}
                >
                  {strings('predict.resolved_outcomes')}
                </Text>
                <Box twClassName="px-2 py-0.5 rounded bg-muted">
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {closedOutcomes.length}
                  </Text>
                </Box>
              </Box>
              <Icon
                name={
                  isResolvedExpanded ? IconName.ArrowUp : IconName.ArrowDown
                }
                size={IconSize.Md}
                color={colors.text.alternative}
              />
            </Box>
            {isResolvedExpanded &&
              closedOutcomes.map((outcome) => (
                <PredictMarketOutcomeResolved
                  key={outcome.id}
                  outcome={outcome}
                  noContainer
                />
              ))}
          </Pressable>
        </Box>
      );
    }

    // Default: show all outcomes
    return (
      <Box>
        {market &&
          (marketStatus === PredictMarketStatus.OPEN
            ? openOutcomes
            : (market.outcomes ?? [])
          ).map((outcome, index) => (
            <PredictMarketOutcome
              key={
                outcome?.id ??
                outcome?.tokens?.[0]?.id ??
                outcome?.title ??
                `outcome-${index}`
              }
              market={market}
              outcome={outcome}
              entryPoint={entryPoint as PredictEntryPoint | undefined}
            />
          ))}
      </Box>
    );
  },
);

PredictMarketDetailsOutcomes.displayName = 'PredictMarketDetailsOutcomes';

export default PredictMarketDetailsOutcomes;
