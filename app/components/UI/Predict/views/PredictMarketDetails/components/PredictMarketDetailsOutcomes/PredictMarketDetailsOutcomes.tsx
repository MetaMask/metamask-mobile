import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { FlashList, type ViewToken } from '@shopify/flash-list';
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
  isResolvedExpanded: boolean;
  onResolvedExpandedToggle: (
    value: boolean | ((prev: boolean) => boolean),
  ) => void;
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
    isResolvedExpanded,
    onResolvedExpandedToggle,
  }: PredictMarketDetailsOutcomesProps) => {
    const tw = useTailwind();
    const { colors } = useTheme();
    const [visibleOutcomeIds, setVisibleOutcomeIds] = useState<Set<string>>(
      () => new Set(),
    );

    const onViewableItemsChanged = useCallback(
      ({ viewableItems }: { viewableItems: ViewToken<PredictOutcome>[] }) => {
        setVisibleOutcomeIds(
          new Set(
            viewableItems
              .map((item) => item.item?.id)
              .filter((id): id is string => Boolean(id)),
          ),
        );
      },
      [],
    );
    const visibilityConfig = useMemo(
      () => ({
        itemVisiblePercentThreshold: 1,
        minimumViewTime: 50,
      }),
      [],
    );

    if (!market) {
      return null;
    }

    const renderOpenOutcomesList = (
      outcomes: PredictOutcome[],
      footer?: React.ReactElement | null,
    ) => (
      <FlashList
        data={outcomes}
        keyExtractor={(outcome, index) =>
          outcome?.id ??
          outcome?.tokens?.[0]?.id ??
          outcome?.title ??
          `outcome-${index}`
        }
        renderItem={({ item }) => (
          <PredictMarketOutcome
            market={market}
            outcome={item}
            entryPoint={entryPoint as PredictEntryPoint | undefined}
            visible={visibleOutcomeIds.has(item.id)}
          />
        )}
        scrollEnabled={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={visibilityConfig}
        ListFooterComponent={footer}
      />
    );

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
      return renderOpenOutcomesList(
        openOutcomes,
        <Pressable
          onPress={() => onResolvedExpandedToggle((prev: boolean) => !prev)}
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
              name={isResolvedExpanded ? IconName.ArrowUp : IconName.ArrowDown}
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
        </Pressable>,
      );
    }

    // Default: show all outcomes
    return marketStatus === PredictMarketStatus.OPEN ? (
      renderOpenOutcomesList(openOutcomes)
    ) : (
      <Box>
        {(market.outcomes ?? []).map((outcome, index) => (
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
