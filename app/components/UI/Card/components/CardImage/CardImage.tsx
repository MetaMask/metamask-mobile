/* eslint-disable @metamask/design-tokens/color-no-hex */
import React from 'react';
import { View } from 'react-native';
import Svg, {
  SvgProps,
  G,
  Rect,
  Path,
  Defs,
  ClipPath,
  LinearGradient,
  Stop,
  Image as SvgImage,
} from 'react-native-svg';
import { CardStatus, CardType } from '../../types';

import FoxImage from '../../../../../images/branding/fox.png';
import MetaMaskWordmarkImage from '../../../../../images/branding/metamask-name-white.png';

const cardImageOriginalWidth = 851;
const cardImageOriginalHeight = 540;
const cardImageAspectRatio = cardImageOriginalWidth / cardImageOriginalHeight;

type CardImageProps = {
  type: CardType;
  status: CardStatus;
  address?: string;
} & SvgProps;

interface CardBackgroundProps extends SvgProps {
  gradientId: string;
  gradientStart: string;
  gradientEnd: string;
  hasLowerOpacity: boolean;
  isFrozen: boolean;
}

// Translucent snowflake watermark drawn over a frozen card.
// Three long axes crossing at the card center plus a small perpendicular
// crossbar near each tip — the classic snowflake silhouette, scalable.
const SNOWFLAKE_ARM = 150;
const SNOWFLAKE_STROKE = 14;
const INNER_BAR_POSITION = 0.55;
const INNER_BAR_HALF = 28;
const OUTER_BAR_POSITION = 0.82;
const OUTER_BAR_HALF = 18;

const FrozenOverlay = () => {
  const cx = cardImageOriginalWidth / 2;
  const cy = cardImageOriginalHeight / 2;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const axes = [0, 60, 120];
  const spokes = [0, 60, 120, 180, 240, 300];

  return (
    <G opacity={0.3}>
      {axes.map((deg) => {
        const a = toRad(deg);
        const dx = Math.cos(a) * SNOWFLAKE_ARM;
        const dy = Math.sin(a) * SNOWFLAKE_ARM;
        return (
          <Path
            key={`axis-${deg}`}
            d={`M${cx - dx} ${cy - dy} L${cx + dx} ${cy + dy}`}
            stroke="#fff"
            strokeWidth={SNOWFLAKE_STROKE}
            strokeLinecap="round"
          />
        );
      })}
      {spokes.map((deg) => {
        const a = toRad(deg);
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        const px = -dy;
        const py = dx;
        const innerCx = cx + dx * SNOWFLAKE_ARM * INNER_BAR_POSITION;
        const innerCy = cy + dy * SNOWFLAKE_ARM * INNER_BAR_POSITION;
        const outerCx = cx + dx * SNOWFLAKE_ARM * OUTER_BAR_POSITION;
        const outerCy = cy + dy * SNOWFLAKE_ARM * OUTER_BAR_POSITION;
        return (
          <G key={`bars-${deg}`}>
            <Path
              d={`M${innerCx - px * INNER_BAR_HALF} ${
                innerCy - py * INNER_BAR_HALF
              } L${innerCx + px * INNER_BAR_HALF} ${
                innerCy + py * INNER_BAR_HALF
              }`}
              stroke="#fff"
              strokeWidth={SNOWFLAKE_STROKE}
              strokeLinecap="round"
            />
            <Path
              d={`M${outerCx - px * OUTER_BAR_HALF} ${
                outerCy - py * OUTER_BAR_HALF
              } L${outerCx + px * OUTER_BAR_HALF} ${
                outerCy + py * OUTER_BAR_HALF
              }`}
              stroke="#fff"
              strokeWidth={SNOWFLAKE_STROKE}
              strokeLinecap="round"
            />
          </G>
        );
      })}
    </G>
  );
};

// Mastercard logo SVG fragment (interlocking circles) sized to fit lower-right of card.
const MastercardLogo = () => (
  <G clipPath="url(#card_clip_mastercard)">
    <Rect
      x={630}
      y={389}
      width={191}
      height={122}
      rx={61}
      fill="#fff"
      stroke="#fff"
      strokeWidth={10}
    />
    <Path d="M749.915 405.967h-48.986v88.019h48.986v-88.019z" fill="#FF5F00" />
    <Path
      d="M704.039 449.976c0-17.106 7.931-33.435 21.305-44.009-24.259-19.128-59.561-14.93-78.689 9.486-18.972 24.26-14.773 59.405 9.642 78.533a55.837 55.837 0 0069.203 0c-13.53-10.575-21.461-26.903-21.461-44.01z"
      fill="#EB001B"
    />
    <Path
      d="M816.008 449.976c0 30.947-25.038 55.985-55.984 55.985-12.597 0-24.727-4.199-34.524-11.975 24.26-19.128 28.459-54.273 9.331-78.689-2.8-3.421-5.91-6.687-9.331-9.33 24.26-19.128 59.561-14.93 78.533 9.486 7.776 9.797 11.975 21.927 11.975 34.523z"
      fill="#F79E1B"
    />
  </G>
);

// Wordmark dimensions: 16% of card width = ~136, aspect 180:90 → height 68. Inset ~5% / 8%.
const WORDMARK_WIDTH = 140;
const WORDMARK_HEIGHT = 70;
const WORDMARK_X = 42;
const WORDMARK_Y = 42;

// Fox dimensions: 14% of card width = ~119, aspect 50:48 → height 114. Inset ~5% / 6%.
const FOX_WIDTH = 110;
const FOX_HEIGHT = FOX_WIDTH * (48 / 50);
const FOX_X = cardImageOriginalWidth - FOX_WIDTH - 42;
const FOX_Y = 32;

const CardBackground = ({
  gradientId,
  gradientStart,
  gradientEnd,
  hasLowerOpacity,
  isFrozen,
  ...svgProps
}: CardBackgroundProps) => (
  <Svg
    fill="none"
    width="100%"
    height="100%"
    viewBox={`0 0 ${cardImageOriginalWidth} ${cardImageOriginalHeight}`}
    opacity={hasLowerOpacity ? 0.5 : 1}
    {...svgProps}
  >
    <G clipPath="url(#card_clip_bg)">
      <Rect width={850.7} height={540} rx={31.8} fill={`url(#${gradientId})`} />
      <SvgImage
        x={WORDMARK_X}
        y={WORDMARK_Y}
        width={WORDMARK_WIDTH}
        height={WORDMARK_HEIGHT}
        href={MetaMaskWordmarkImage}
        preserveAspectRatio="xMinYMid meet"
      />
      <SvgImage
        x={FOX_X}
        y={FOX_Y}
        width={FOX_WIDTH}
        height={FOX_HEIGHT}
        href={FoxImage}
        preserveAspectRatio="xMaxYMid meet"
      />
      <MastercardLogo />
      {isFrozen && <FrozenOverlay />}
    </G>
    <Defs>
      <LinearGradient
        id={gradientId}
        x1={0}
        y1={0}
        x2={850.7}
        y2={540}
        gradientUnits="userSpaceOnUse"
      >
        <Stop offset={0} stopColor={gradientStart} />
        <Stop offset={1} stopColor={gradientEnd} />
      </LinearGradient>
      <ClipPath id="card_clip_bg">
        <Rect width={850.7} height={540} rx={31.8} fill="#fff" />
      </ClipPath>
      <ClipPath id="card_clip_mastercard">
        <Path fill="#fff" transform="translate(625 384)" d="M0 0H201V132H0z" />
      </ClipPath>
    </Defs>
  </Svg>
);

interface CardVariantProps {
  hasLowerOpacity: boolean;
  isFrozen: boolean;
}

const VirtualCardImage = ({ hasLowerOpacity, isFrozen }: CardVariantProps) => (
  <View style={{ aspectRatio: cardImageAspectRatio }}>
    <CardBackground
      gradientId="card_bg_virtual"
      gradientStart="#FF8D5D"
      gradientEnd="#FF5C16"
      hasLowerOpacity={hasLowerOpacity}
      isFrozen={isFrozen}
    />
  </View>
);

const MetalCardImage = ({ hasLowerOpacity, isFrozen }: CardVariantProps) => (
  <View style={{ aspectRatio: cardImageAspectRatio }}>
    <CardBackground
      gradientId="card_bg_metal"
      gradientStart="#3D065F"
      gradientEnd="#7E0CC5"
      hasLowerOpacity={hasLowerOpacity}
      isFrozen={isFrozen}
    />
  </View>
);

const CardImage = (props: CardImageProps) => {
  const { type, status } = props;
  const isFrozen = status === CardStatus.FROZEN;
  const hasLowerOpacity = isFrozen || status === CardStatus.BLOCKED;

  switch (type) {
    case CardType.VIRTUAL:
      return (
        <VirtualCardImage
          hasLowerOpacity={hasLowerOpacity}
          isFrozen={isFrozen}
        />
      );
    case CardType.PHYSICAL:
    case CardType.METAL:
      return (
        <MetalCardImage hasLowerOpacity={hasLowerOpacity} isFrozen={isFrozen} />
      );
  }
};

export default CardImage;
