import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ButtonBase,
  ButtonBaseSize,
  IconColor,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';

export interface AssetListControlBarProps {
  networkLabel: string;
  isNetworkFilterActive: boolean;
  onNetworkPress: () => void;
  typeLabel: string;
  isTypeFilterActive: boolean;
  onTypePress: () => void;
}

/**
 * Horizontally-scrollable filter chip row for the Activity screen — mirrors
 * the extension's `AssetListControlBar` pattern. Pure presentational: the
 * parent screen owns filter state, label resolution, and sheet rendering.
 *
 * Sheets must remain siblings of the scroll content (not nested inside it),
 * since the underlying `component-library` `BottomSheet` does not portal.
 */
const AssetListControlBar: React.FC<AssetListControlBarProps> = ({
  networkLabel,
  isNetworkFilterActive,
  onNetworkPress,
  typeLabel,
  isTypeFilterActive,
  onTypePress,
}) => {
  const tw = useTailwind();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('flex-row gap-2 pb-4')}
    >
      <ButtonBase
        size={ButtonBaseSize.Md}
        startIconName={IconName.Filter}
        startIconProps={
          isNetworkFilterActive
            ? { color: IconColor.PrimaryDefault }
            : undefined
        }
        textProps={
          isNetworkFilterActive
            ? { color: TextColor.PrimaryDefault }
            : undefined
        }
        onPress={onNetworkPress}
        testID={ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP}
      >
        {networkLabel}
      </ButtonBase>
      <ButtonBase
        size={ButtonBaseSize.Md}
        startIconName={IconName.Customize}
        startIconProps={
          isTypeFilterActive ? { color: IconColor.PrimaryDefault } : undefined
        }
        textProps={
          isTypeFilterActive ? { color: TextColor.PrimaryDefault } : undefined
        }
        onPress={onTypePress}
        testID={ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP}
      >
        {typeLabel}
      </ButtonBase>
    </ScrollView>
  );
};

export default AssetListControlBar;
