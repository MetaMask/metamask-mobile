import React, { useId } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../../../../../util/theme';
import { CardBackdropTestIds } from './CardBackdrop.testIds';

export interface CardBackdropProps {
  /** The reveal adds spotlights and a few sparkles to the quiet detail halo. */
  variant?: 'detail' | 'reveal';
}

const SPARKLES = [
  [42, 260, 0.6],
  [355, 292, 0.9],
  [340, 440, 0.5],
  [60, 586, 0.7],
  [320, 635, 0.4],
] as const;

/** Provider-independent lighting behind the Gacha card presentation. */
const CardBackdrop = ({ variant = 'detail' }: CardBackdropProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const id = useId();
  const light = colors.text.default;
  const background = colors.background.default;
  const isReveal = variant === 'reveal';

  return (
    <Box
      twClassName="absolute top-0 right-0 bottom-0 left-0 overflow-hidden bg-default"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={CardBackdropTestIds.CONTAINER}
    >
      <LinearGradient
        colors={[colors.border.default, colors.background.section, background]}
        locations={[0, 0.46, 0.84]}
        style={tw.style('absolute top-0 right-0 bottom-0 left-0 opacity-70')}
        testID={CardBackdropTestIds.BASE_LIGHT}
      />
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="none"
      >
        <Defs>
          <RadialGradient id={`${id}-halo`} cx="50%" cy="25%" rx="75%" ry="65%">
            <Stop
              offset="0"
              stopColor={light}
              stopOpacity={isReveal ? 0.4 : 0.28}
            />
            <Stop offset="1" stopColor={light} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`${id}-beam`}>
            <Stop offset="0" stopColor={light} stopOpacity="0.6" />
            <Stop offset="1" stopColor={light} stopOpacity="0" />
          </RadialGradient>
          <SvgLinearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.35" stopColor={background} stopOpacity="0" />
            <Stop offset="1" stopColor={background} />
          </SvgLinearGradient>
        </Defs>
        <Rect width="390" height="844" fill={`url(#${id}-halo)`} />
        {isReveal && (
          <G testID={CardBackdropTestIds.REVEAL_LIGHTS}>
            <G fill={`url(#${id}-beam)`}>
              <Ellipse
                cx="90"
                cy="25"
                rx="42"
                ry="370"
                rotation="28"
                origin="90,25"
              />
              <Ellipse
                cx="265"
                cy="-35"
                rx="52"
                ry="390"
                rotation="-20"
                origin="265,-35"
              />
              <Ellipse
                cx="360"
                cy="30"
                rx="30"
                ry="270"
                rotation="15"
                origin="360,30"
              />
            </G>
            <G fill={light} opacity="0.4">
              {SPARKLES.map(([x, y, scale]) => (
                <Path
                  key={`${x}-${y}`}
                  d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5 Z"
                  transform={`translate(${x} ${y}) scale(${scale})`}
                />
              ))}
            </G>
          </G>
        )}
        <Rect width="390" height="844" fill={`url(#${id}-fade)`} />
      </Svg>
    </Box>
  );
};

export default CardBackdrop;
