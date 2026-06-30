import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ButtonBase,
  ButtonBaseSize,
  IconName,
} from '@metamask/design-system-react-native';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';

export interface AssetListControlBarProps {
  typeLabel: string;
  onTypePress: () => void;
  /** Network chip — shown unless the Type filter replaces it (Perps/Predictions). */
  showNetworkFilter: boolean;
  networkLabel: string;
  onNetworkPress: () => void;
  /** Perps sub-filter chip — rendered in the network chip's place when Type = Perps. */
  showPerpsFilter: boolean;
  perpsLabel: string;
  onPerpsPress: () => void;
  suppressTestIDs?: boolean;
}

/**
 * Horizontally-scrollable filter chip row for the Activity screen — mirrors
 * the extension's `AssetListControlBar` pattern. Pure presentational: the
 * parent screen owns filter state, label resolution, and sheet rendering.
 *
 * The Type chip is always rendered first; the secondary slot shows either the
 * Network chip or the Perps sub-filter chip (or nothing, e.g. for Predictions).
 * Chips use the default design-system select-button styling (plain label +
 * dropdown chevron, no leading icon, no accent colour).
 *
 * Sheets must remain siblings of the scroll content (not nested inside it),
 * since the underlying `component-library` `BottomSheet` does not portal.
 */
const AssetListControlBar: React.FC<AssetListControlBarProps> = ({
  typeLabel,
  onTypePress,
  showNetworkFilter,
  networkLabel,
  onNetworkPress,
  showPerpsFilter,
  perpsLabel,
  onPerpsPress,
  suppressTestIDs = false,
}) => {
  const tw = useTailwind();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('flex-row gap-2 px-4 pb-4')}
    >
      <ButtonBase
        size={ButtonBaseSize.Md}
        endIconName={IconName.ArrowDown}
        onPress={onTypePress}
        testID={
          suppressTestIDs
            ? undefined
            : ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP
        }
      >
        {typeLabel}
      </ButtonBase>

      {showNetworkFilter ? (
        <ButtonBase
          size={ButtonBaseSize.Md}
          endIconName={IconName.ArrowDown}
          onPress={onNetworkPress}
          testID={
            suppressTestIDs
              ? undefined
              : ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP
          }
        >
          {networkLabel}
        </ButtonBase>
      ) : null}

      {showPerpsFilter ? (
        <ButtonBase
          size={ButtonBaseSize.Md}
          endIconName={IconName.ArrowDown}
          onPress={onPerpsPress}
          testID={
            suppressTestIDs
              ? undefined
              : ActivityScreenSelectorsIDs.PERPS_FILTER_CHIP
          }
        >
          {perpsLabel}
        </ButtonBase>
      ) : null}
    </ScrollView>
  );
};

export default AssetListControlBar;
