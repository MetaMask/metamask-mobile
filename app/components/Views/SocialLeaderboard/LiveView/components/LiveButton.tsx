import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { LiveViewSelectorsIDs } from '../LiveView.testIds';

const PAUSED_COLOR_PROPS = { twClassName: TextColor.TextMuted };

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
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      onPress={onPress}
      testID={LiveViewSelectorsIDs.STREAM_BUTTON}
      accessibilityLabel={label}
      textProps={isLive ? undefined : PAUSED_COLOR_PROPS}
      startIconName={isLive ? IconName.Play : IconName.Pause}
      startIconProps={isLive ? undefined : PAUSED_COLOR_PROPS}
    >
      {label}
    </Button>
  );
};

export default LiveButton;
