import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ButtonBase,
  ButtonBaseSize,
  IconName,
} from '@metamask/design-system-react-native';
import CapsuleGlass from '../../../../../component-library/components-temp/CapsuleGlass';
import PerpsAggregatedFillsCheckbox from '../../../../UI/Perps/components/PerpsAggregatedFillsCheckbox';

/**
 * Describes a single filter chip: its label, press handler, and the testID to
 * apply (suppressed by the bar when rendered in the pinned copy).
 */
export interface FilterChipDescriptor {
  label: string;
  onPress: () => void;
  testID: string;
}

export interface AggregatedToggleDescriptor {
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  testID: string;
}

export interface AssetListControlBarProps {
  /** The Type filter chip — always rendered first. */
  typeChip: FilterChipDescriptor;
  /**
   * The secondary chip rendered after the Type chip: the network filter, the
   * Perps sub-filter, or `null`/`undefined` to render nothing (e.g. for
   * Predictions). One slot, so adding a new secondary filter is a parent-side
   * concern only.
   */
  secondaryChip?: FilterChipDescriptor | null;
  /**
   * Optional Aggregated checkbox shown on Perps Trades (and pinned with the
   * chips). Omitted when the current type/sub-filter has no fill aggregation.
   * The Aggregated control, rendered after the chips. Only supplied for Perps trades, where
   * fills can be collapsed per order; omitted everywhere else.
   */
  aggregatedToggle?: AggregatedToggleDescriptor | null;
  suppressTestIDs?: boolean;
  /** Draws each chip in a glass capsule, to match a glass header. */
  isGlass?: boolean;
  /** Pinned glass copy only: extra top padding so the pills clear the back capsule. */
  isPinned?: boolean;
  /** Scroll-view testID (suppressed copies still carry it). */
  testID?: string;
}

/**
 * A single filter chip — plain design-system select-button styling (label +
 * dropdown chevron). `testID` is dropped when the bar is rendered as its pinned
 * copy to avoid duplicate testIDs.
 */
const FilterChip: React.FC<{
  chip: FilterChipDescriptor;
  suppressTestID: boolean;
  isGlass: boolean;
}> = ({ chip, suppressTestID, isGlass }) => {
  const button = (
    <ButtonBase
      size={ButtonBaseSize.Md}
      endIconName={IconName.ArrowDown}
      onPress={chip.onPress}
      testID={suppressTestID ? undefined : chip.testID}
      className={isGlass ? 'bg-transparent' : undefined}
    >
      {chip.label}
    </ButtonBase>
  );

  return isGlass ? <CapsuleGlass>{button}</CapsuleGlass> : button;
};

/**
 * Horizontally-scrollable filter chip row for the Activity screen — mirrors
 * the extension's `AssetListControlBar` pattern. Pure presentational: the
 * parent screen owns filter state, label resolution, and opens filter sheets
 * via `ROOT_MODAL_FLOW` navigation (so sheets cover the tab bar).
 *
 * Chips use the default design-system select-button styling (plain label +
 * dropdown chevron, no leading icon, no accent colour).
 */
const AssetListControlBar: React.FC<AssetListControlBarProps> = ({
  typeChip,
  secondaryChip,
  aggregatedToggle,
  suppressTestIDs = false,
  isGlass = false,
  isPinned = false,
  testID,
}) => {
  const tw = useTailwind();

  const aggregatedCheckbox = aggregatedToggle ? (
    <PerpsAggregatedFillsCheckbox
      isSelected={aggregatedToggle.isSelected}
      onChange={aggregatedToggle.onChange}
      testID={suppressTestIDs ? undefined : aggregatedToggle.testID}
      isGlass={isGlass}
    />
  ) : null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Glass capsules cast a shadow wider than the row; clipping it leaves a grey band.
      style={isGlass ? tw.style('overflow-visible') : undefined}
      // All copies keep the list inset (px-4). The pinned copy adds top padding to clear the back capsule.
      contentContainerStyle={tw.style(
        'flex-row items-center gap-2 px-4 pb-2',
        isPinned && 'pt-1',
      )}
      testID={testID}
    >
      <FilterChip
        chip={typeChip}
        suppressTestID={suppressTestIDs}
        isGlass={isGlass}
      />
      {secondaryChip ? (
        <FilterChip
          chip={secondaryChip}
          suppressTestID={suppressTestIDs}
          isGlass={isGlass}
        />
      ) : null}
      {aggregatedCheckbox && isGlass ? (
        <CapsuleGlass>{aggregatedCheckbox}</CapsuleGlass>
      ) : (
        aggregatedCheckbox
      )}
    </ScrollView>
  );
};

export default AssetListControlBar;
