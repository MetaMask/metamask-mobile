import {
  FilterButton,
  FilterButtonSize,
  FilterButtonVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { LiveViewSelectorsIDs } from '../LiveView.testIds';
import LiveIcon from './LiveIcon';

const PAUSED_TEXT_PROPS = { twClassName: 'text-muted' };

export interface LiveButtonProps {
  isLive: boolean;
  onPress: () => void;
}

/** Live / Paused toggle for the Live feed header. */
const LiveButton: React.FC<LiveButtonProps> = ({ isLive, onPress }) => {
  const label = strings(
    isLive
      ? 'social_leaderboard.feed.live_stream.live'
      : 'social_leaderboard.feed.live_stream.paused',
  );

  return (
    <FilterButton
      isSelected
      variant={FilterButtonVariant.Secondary}
      size={FilterButtonSize.Sm}
      onPress={onPress}
      testID={LiveViewSelectorsIDs.STREAM_BUTTON}
      accessibilityLabel={label}
      textProps={isLive ? undefined : PAUSED_TEXT_PROPS}
      startAccessory={<LiveIcon isLive={isLive} />}
    >
      {label}
    </FilterButton>
  );
};

export default LiveButton;
