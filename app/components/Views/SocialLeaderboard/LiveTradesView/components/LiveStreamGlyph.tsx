import { IconColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import PauseIcon from './pause.svg';
import PlayIcon from './play.svg';

/** Medium icon size, matching the design-system 20px icon. */
const GLYPH_SIZE = 20;

export interface LiveStreamGlyphProps {
  isLive: boolean;
  testID: string;
}

/**
 * Play and pause glyphs for the live trades stream button. These assets are
 * local to this control and follow the button's theme color.
 */
const LiveStreamGlyph: React.FC<LiveStreamGlyphProps> = ({
  isLive,
  testID,
}) => {
  const tw = useTailwind();
  const Glyph = isLive ? PlayIcon : PauseIcon;
  const color = isLive ? IconColor.IconDefault : IconColor.IconAlternative;

  return (
    <Glyph
      name={isLive ? 'play' : 'pause'}
      width={GLYPH_SIZE}
      height={GLYPH_SIZE}
      fill="currentColor"
      style={tw.style(color)}
      testID={testID}
    />
  );
};

export default LiveStreamGlyph;
