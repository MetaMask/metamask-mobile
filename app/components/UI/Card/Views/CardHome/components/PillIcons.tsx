/* eslint-disable @metamask/design-tokens/color-no-hex */
import React from 'react';
import { Image } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import SnowflakePng from '../../../../../../images/snowflake.png';

interface PillIconProps {
  size?: number;
  color?: string;
}

// Snowflake glyph — renders the shared PNG asset and tints it to match the
// surrounding theme color. Used by the Freeze pill and re-exported for the
// frozen-state overlay on the card image.
export const SnowflakeIcon = ({
  size = 24,
  color = 'currentColor',
}: PillIconProps) => (
  <Image
    source={SnowflakePng}
    style={{ width: size, height: size, tintColor: color }}
    resizeMode="contain"
  />
);

// Export the raw PNG for places that want to render the snowflake directly,
// e.g. as an absolutely-positioned overlay over the card art.
export { SnowflakePng };

// 3x3 keypad of dots; approximates the Figma asset used on the PIN pill.
export const KeypadIcon = ({
  size = 24,
  color = 'currentColor',
}: PillIconProps) => {
  const dotR = 1.4;
  const cols = [6, 12, 18];
  const rows = [6, 12, 18];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {rows.map((y) =>
        cols.map((x) => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} r={dotR} fill={color} />
        )),
      )}
    </Svg>
  );
};

// Stylized flame; used on the Unfreeze pill to suggest melting the ice.
export const FireIcon = ({
  size = 24,
  color = 'currentColor',
}: PillIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2c.6 4 3.2 5.4 4.6 7.6 1.4 2.2 1.4 4.8.2 6.9-1.3 2.2-3.9 3.5-6.8 3.5-3 0-5.6-1.3-6.9-3.5-1.2-2.1-1.2-4.7.3-6.9C5 6.7 7.2 6.3 8 3.6c1.4 1.7 2.4 3.5 2.8 5.4C11.5 6 11.7 4 12 2z"
      fill={color}
    />
    <Path
      d="M12 11c.4 2 1.6 2.8 2.3 3.9.7 1.1.7 2.4.1 3.4-.7 1.1-2 1.8-3.4 1.8-1.5 0-2.8-.7-3.4-1.8-.7-1-.6-2.3.1-3.4.7-1.1 1.8-1.3 2.2-2.7.6.8 1.1 1.7 1.4 2.7.3-1.3.4-2.6.7-3.9z"
      fill="#fff"
      fillOpacity={0.35}
    />
  </Svg>
);
