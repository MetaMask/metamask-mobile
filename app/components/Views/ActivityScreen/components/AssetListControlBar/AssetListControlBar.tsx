import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ButtonBase,
  ButtonBaseSize,
  IconName,
} from '@metamask/design-system-react-native';

/**
 * Describes a single filter chip: its label, press handler, and the testID to
 * apply (suppressed by the bar when rendered in the pinned copy).
 */
export interface FilterChipDescriptor {
  label: string;
  onPress: () => void;
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
  suppressTestIDs?: boolean;
}

/**
 * A single filter chip — plain design-system select-button styling (label +
 * dropdown chevron). `testID` is dropped when the bar is rendered as its pinned
 * copy to avoid duplicate testIDs.
 */
const FilterChip: React.FC<{
  chip: FilterChipDescriptor;
  suppressTestID: boolean;
}> = ({ chip, suppressTestID }) => (
  <ButtonBase
    size={ButtonBaseSize.Md}
    endIconName={IconName.ArrowDown}
    onPress={chip.onPress}
    testID={suppressTestID ? undefined : chip.testID}
  >
    {chip.label}
  </ButtonBase>
);

/**
 * Horizontally-scrollable filter chip row for the Activity screen — mirrors
 * the extension's `AssetListControlBar` pattern. Pure presentational: the
 * parent screen owns filter state, label resolution, and sheet rendering.
 *
 * Chips use the default design-system select-button styling (plain label +
 * dropdown chevron, no leading icon, no accent colour).
 *
 * Sheets must remain siblings of the scroll content (not nested inside it),
 * since the underlying `component-library` `BottomSheet` does not portal.
 */
const AssetListControlBar: React.FC<AssetListControlBarProps> = ({
  typeChip,
  secondaryChip,
  suppressTestIDs = false,
}) => {
  const tw = useTailwind();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('flex-row gap-2 px-4 pb-4')}
    >
      <FilterChip chip={typeChip} suppressTestID={suppressTestIDs} />
      {secondaryChip ? (
        <FilterChip chip={secondaryChip} suppressTestID={suppressTestIDs} />
      ) : null}
    </ScrollView>
  );
};

export default AssetListControlBar;
