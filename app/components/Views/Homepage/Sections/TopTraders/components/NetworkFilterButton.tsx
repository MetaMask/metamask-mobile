import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  Icon,
  IconName,
  IconColor,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { NetworkFilterSelection } from '../types';

export interface NetworkFilterButtonProps {
  /** Currently selected network label (null = All networks) */
  selectedNetwork: NetworkFilterSelection;
  /** Called when the user taps the button */
  onPress: () => void;
  testID?: string;
}

/**
 * NetworkFilterButton — compact dropdown-style button for filtering by network.
 *
 * Follows the same visual pattern as the FilterButton in the Trending section.
 * Tapping opens the TrendingTokenNetworkBottomSheet managed by the parent.
 */
const NetworkFilterButton: React.FC<NetworkFilterButtonProps> = ({
  selectedNetwork,
  onPress,
  testID,
}) => {
  const tw = useTailwind();

  const label = selectedNetwork ?? strings('social_leaderboard.all_networks');

  return (
    <TouchableOpacity
      testID={testID ?? 'top-traders-network-filter-button'}
      onPress={onPress}
      style={tw.style('self-start rounded-lg bg-muted py-2 px-3')}
      activeOpacity={0.2}
    >
      <View style={tw`flex-row items-center justify-center gap-1`}>
        <Text
          twClassName="text-[14px] font-semibold text-default"
          numberOfLines={1}
        >
          {label}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          color={IconColor.IconAlternative}
          size={IconSize.Xs}
        />
      </View>
    </TouchableOpacity>
  );
};

export default NetworkFilterButton;
