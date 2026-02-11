import React from 'react';
import { useColorScheme } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

interface PredictSportTeamHelmetProps {
  color: string; // Team primary color (hex)
  size?: number; // Size in pixels (default: 48)
  flipped?: boolean; // Mirror horizontally for away team
  testID?: string;
}

const VIEWBOX_WIDTH = 40;
const VIEWBOX_HEIGHT = 40;

/**
 * Football helmet SVG component with dynamic team color.
 * Used in NFL game cards and details screens.
 */
const PredictSportTeamHelmet: React.FC<PredictSportTeamHelmetProps> = ({
  color,
  size = 48,
  flipped = false,
  testID,
}) => {
  const colorScheme = useColorScheme();
  const facemaskColor = colorScheme === 'dark' ? 'white' : 'black';

  const transform = flipped
    ? `scale(-1, 1) translate(-${VIEWBOX_WIDTH}, 0)`
    : undefined;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      testID={testID}
    >
      <G transform={transform}>
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M27.2678 23.3477H36.9074C38.6148 23.3478 39.9991 24.7321 39.9992 26.4395V34.3408C39.9991 36.0482 38.6149 37.4325 36.9074 37.4326H34.5705C33.4493 37.4324 32.4161 36.8251 31.8703 35.8457L28.5207 29.832H21.7063V27.7705H27.3723L21.7668 17.708L23.5686 16.7061L27.2678 23.3477ZM30.8801 29.832L33.6711 34.8418C33.853 35.1682 34.1969 35.3709 34.5705 35.3711H36.9074C37.4765 35.371 37.9386 34.9099 37.9387 34.3408V29.832H30.8801ZM29.7317 27.7705H37.9387V26.4395C37.9385 25.8705 37.4764 25.4083 36.9074 25.4082H28.4162L29.7317 27.7705Z"
          fill={facemaskColor}
        />
        <Path
          d="M2.66583 11.1403C9.80542 -0.512294 26.7901 -0.346523 33.7008 11.4432L34.3731 12.5885C34.8426 13.3899 34.438 14.4197 33.5488 14.688L24.6789 17.3641C21.8122 18.2292 20.456 21.5024 21.8709 24.1415L26.2993 32.4024C27.4932 34.6294 25.8802 37.3249 23.3535 37.325H6.71177C5.91748 37.325 5.20157 36.845 4.90015 36.1102L1.3514 27.4537C-0.835889 22.1173 -0.347139 16.0579 2.66583 11.1403ZM14.9375 23.0968C13.4949 23.0968 12.325 24.266 12.3247 25.7086C12.3247 27.1513 13.4948 28.3213 14.9375 28.3213C16.3802 28.3213 17.5492 27.1512 17.5492 25.7086C17.549 24.266 16.3801 23.0969 14.9375 23.0968Z"
          fill={color}
        />
      </G>
    </Svg>
  );
};

export default PredictSportTeamHelmet;
