import React, { useCallback, useMemo } from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import { formatVolume } from '../../../events/shared/formatting';
import type { MarketLayoutSection } from './createMarketLayoutProjection';
import { EventMarketLayoutSectionTestIds } from './EventMarketLayoutSection.testIds';
import { EventMarketPeriodChips } from './EventMarketPeriodChips';
import { EventMarketSection } from './EventMarketSection';
import {
  getMarketLayoutPeriodTitle,
  getMarketLayoutTitle,
} from './marketLayoutTitles';

/** The chip key of a period without a subgroup. */
export const UNKEYED_PERIOD = '';

/** The key a period is selected by, its subgroup key or `UNKEYED_PERIOD`. */
export const periodKeyOf = (period: { key?: string }): string =>
  period.key ?? UNKEYED_PERIOD;

export interface EventMarketLayoutSectionHeaderProps {
  /** Identifies the section's UI state; unique across tabs. */
  stateKey: string;
  section: MarketLayoutSection;
  /** Sections after the first get a divider above them. */
  showDivider: boolean;
  open: boolean;
  onToggle: (stateKey: string, open: boolean) => void;
  /** The selected chip's period key. */
  selectedPeriodKey: string;
  onSelectPeriod: (stateKey: string, periodKey: string) => void;
}

/**
 * The list row heading one projected Event market section: a divider, the
 * collapsible header with the section's volume, and period chips while open
 * when the section has several periods. Its cards are list rows of their own.
 */
export const EventMarketLayoutSectionHeader = React.memo(
  ({
    stateKey,
    section,
    showDivider,
    open,
    onToggle,
    selectedPeriodKey,
    onSelectPeriod,
  }: EventMarketLayoutSectionHeaderProps) => {
    const chips = useMemo(
      () =>
        section.periods.map((period) => ({
          key: periodKeyOf(period),
          label: getMarketLayoutPeriodTitle(period.key),
        })),
      [section.periods],
    );
    const volume = formatVolume(section.volume);
    const handleToggle = useCallback(
      (nextOpen: boolean) => onToggle(stateKey, nextOpen),
      [onToggle, stateKey],
    );
    const handleSelectPeriod = useCallback(
      (periodKey: string) => onSelectPeriod(stateKey, periodKey),
      [onSelectPeriod, stateKey],
    );

    return (
      // Full width: the list pads its rows, the header pads its own content.
      <Box
        twClassName="-mx-4"
        testID={EventMarketLayoutSectionTestIds.section(section.key)}
      >
        {showDivider ? <SectionDivider /> : null}
        <EventMarketSection
          title={getMarketLayoutTitle(section.key)}
          volume={volume === undefined ? undefined : `$${volume}`}
          open={open}
          onToggle={handleToggle}
        >
          {chips.length > 1 ? (
            <Box twClassName="px-4">
              <EventMarketPeriodChips
                items={chips}
                selectedKey={selectedPeriodKey}
                onSelect={handleSelectPeriod}
              />
            </Box>
          ) : null}
        </EventMarketSection>
      </Box>
    );
  },
);
