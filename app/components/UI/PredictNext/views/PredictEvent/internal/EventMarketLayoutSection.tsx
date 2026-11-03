import React, { useCallback, useMemo } from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import { formatVolume } from '../../../events/shared/formatting';
import type {
  PredictGame,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import type { MarketLayoutSection } from './createMarketLayoutProjection';
import { EventMarketLayoutCard } from './EventMarketLayoutCard';
import { EventMarketLayoutSectionTestIds } from './EventMarketLayoutSection.testIds';
import { EventMarketPeriodChips } from './EventMarketPeriodChips';
import { EventMarketSection } from './EventMarketSection';
import {
  getMarketLayoutPeriodTitle,
  getMarketLayoutTitle,
} from './marketLayoutTitles';

/** The chip key of a period without a subgroup. */
export const UNKEYED_PERIOD = '';

export interface EventMarketLayoutSectionProps {
  /** Identifies the section's UI state; unique across tabs. */
  stateKey: string;
  section: MarketLayoutSection;
  /** Sections after the first get a divider above them. */
  showDivider: boolean;
  initialOpen: boolean;
  onToggle: (stateKey: string, open: boolean) => void;
  /** The chip chosen for this section; the first period when absent or gone. */
  selectedPeriodKey?: string;
  onSelectPeriod: (stateKey: string, periodKey: string) => void;
  /** Lines chosen in line pickers, by group key. */
  selectedMarketIds: Readonly<Record<string, PredictMarket['id']>>;
  onSelectMarket: (groupKey: string, marketId: PredictMarket['id']) => void;
  game?: PredictGame;
  onOrder: (market: PredictMarket, outcome: PredictOutcome) => void;
  onRulesPress: (market: PredictMarket) => void;
}

/**
 * One projected Event market section: a collapsible header with its volume,
 * period chips when it has several periods, and the selected period's cards.
 * Holds no state, so it can unmount outside the list window.
 */
export const EventMarketLayoutSection = React.memo(
  ({
    stateKey,
    section,
    showDivider,
    initialOpen,
    onToggle,
    selectedPeriodKey,
    onSelectPeriod,
    selectedMarketIds,
    onSelectMarket,
    game,
    onOrder,
    onRulesPress,
  }: EventMarketLayoutSectionProps) => {
    const periods = useMemo(
      () =>
        section.periods.map((period) => ({
          key: period.key ?? UNKEYED_PERIOD,
          label: getMarketLayoutPeriodTitle(period.key),
          cards: period.cards,
        })),
      [section.periods],
    );
    const selectedPeriod =
      periods.find((period) => period.key === selectedPeriodKey) ?? periods[0];
    const volume = formatVolume(section.volume);
    const handleToggle = useCallback(
      (open: boolean) => onToggle(stateKey, open),
      [onToggle, stateKey],
    );
    const handleSelectPeriod = useCallback(
      (periodKey: string) => onSelectPeriod(stateKey, periodKey),
      [onSelectPeriod, stateKey],
    );

    return (
      // Full width: the list pads its rows, the section pads its own content.
      <Box
        twClassName="-mx-4"
        testID={EventMarketLayoutSectionTestIds.section(section.key)}
      >
        {showDivider ? <SectionDivider /> : null}
        <EventMarketSection
          title={getMarketLayoutTitle(section.key)}
          volume={volume === undefined ? undefined : `$${volume}`}
          initialOpen={initialOpen}
          onToggle={handleToggle}
        >
          <Box twClassName="gap-3 px-4">
            {periods.length > 1 && selectedPeriod ? (
              <EventMarketPeriodChips
                items={periods}
                selectedKey={selectedPeriod.key}
                onSelect={handleSelectPeriod}
              />
            ) : null}
            {selectedPeriod?.cards.map((card) => (
              <EventMarketLayoutCard
                key={card.key}
                card={card}
                game={game}
                selectedMarketId={
                  card.type === 'standard'
                    ? undefined
                    : selectedMarketIds[card.key]
                }
                onSelectMarket={onSelectMarket}
                onOrder={onOrder}
                onRulesPress={onRulesPress}
              />
            ))}
          </Box>
        </EventMarketSection>
      </Box>
    );
  },
);
