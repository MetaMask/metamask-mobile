import React, { forwardRef, useMemo } from 'react';
import type { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontFamily,
  FontWeight,
  Text,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import TraderAvatar from '../SocialFeed/components/TraderAvatar';
import MetaMaskWordmark from '../../../images/branding/metamask-wordmark-stacked.svg';
import ShareCardChart from './ShareCardChart';
import { getShareCardTheme } from './shareCardTheme';
import type { ShareCardModel } from './ShareCard.types';
import { ShareCardSelectorsIDs } from './ShareCard.testIds';

/** Every measurement below is in card units: the card is 1080 × 1080. */
const CARD_UNITS = 1080;
const FRAME_PATH = 'M152 0H1080V928L928 1080H0V152L152 0Z';
const PANEL_OFFSET = 40;
const PANEL_PATH = 'M128 0H1000V744L872 872H0V128L128 0Z';
const PANEL_WIDTH = 1000;
const PANEL_HEIGHT = 872;
const CONTENT_INSET = 96;
const LOGO_WIDTH = 132.48;
const LOGO_HEIGHT = 72;

export interface ShareCardProps {
  card: ShareCardModel;
  /** Rendered edge length in points. Everything scales from 1080 units. */
  size: number;
}

/**
 * Square, always-dark result card meant to be captured as an image. It is a
 * pure function of `card`: no data fetching, no theme lookups, so the preview
 * and the exported PNG are the same pixels.
 */
const ShareCard = forwardRef<View, ShareCardProps>(({ card, size }, ref) => {
  const tw = useTailwind();
  const theme = useMemo(
    () => getShareCardTheme(card.direction),
    [card.direction],
  );
  const unit = size / CARD_UNITS;
  const u = (value: number) => value * unit;

  const text = useMemo(() => {
    const scale = (value: number) => value * unit;
    return {
      chip: { fontSize: scale(28), lineHeight: scale(34), color: theme.onChip },
      caption: {
        fontSize: scale(28),
        lineHeight: scale(34),
        letterSpacing: scale(0.56),
        color: theme.soft,
        textTransform: 'uppercase' as const,
      },
      market: { fontSize: scale(44), lineHeight: scale(53), color: theme.ink },
      hero: {
        fontSize: scale(156),
        lineHeight: scale(172),
        letterSpacing: scale(-1.56),
        color: theme.accent,
        includeFontPadding: false,
      },
      change: {
        fontSize: scale(44),
        lineHeight: scale(53),
        color: theme.accent,
      },
      statValue: {
        fontSize: scale(44),
        lineHeight: scale(53),
        color: theme.ink,
      },
      promoCode: {
        fontSize: scale(44),
        lineHeight: scale(53),
        color: theme.onAccent,
      },
      promoCaption: {
        fontSize: scale(28),
        lineHeight: scale(34),
        letterSpacing: scale(0.56),
        color: theme.onAccent,
        opacity: 0.7,
        textTransform: 'uppercase' as const,
      },
    };
  }, [unit, theme]);

  const changeGlyph = card.direction === 'up' ? '▲' : '▼';

  return (
    <Box
      ref={ref}
      collapsable={false}
      style={{ width: size, height: size }}
      testID={ShareCardSelectorsIDs.CARD}
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${CARD_UNITS} ${CARD_UNITS}`}
        style={tw.style('absolute inset-0')}
      >
        <Path d={FRAME_PATH} fill={theme.accent} />
        <Path
          d={PANEL_PATH}
          fill={theme.panel}
          transform={`translate(${PANEL_OFFSET} ${PANEL_OFFSET})`}
        />
      </Svg>

      <Box
        style={{
          paddingTop: u(PANEL_OFFSET),
          paddingHorizontal: u(PANEL_OFFSET),
        }}
      >
        <Box
          style={{
            height: u(PANEL_HEIGHT),
            paddingVertical: u(80),
            gap: u(52),
          }}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            style={{ paddingHorizontal: u(CONTENT_INSET), gap: u(24) }}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="shrink"
              style={{
                backgroundColor: theme.chip,
                borderRadius: u(16),
                paddingVertical: u(12),
                paddingLeft: u(12),
                paddingRight: u(24),
                gap: u(12),
              }}
            >
              <TraderAvatar
                imageUrl={card.author.imageUrl}
                address={card.author.address}
                size={u(40)}
              />
              <Text
                fontWeight={FontWeight.Medium}
                numberOfLines={1}
                allowFontScaling={false}
                twClassName="shrink"
                style={text.chip}
                testID={ShareCardSelectorsIDs.AUTHOR}
              >
                {card.author.label}
              </Text>
            </Box>
            <Text
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              allowFontScaling={false}
              style={text.caption}
              testID={ShareCardSelectorsIDs.STATUS}
            >
              {card.statusLabel}
            </Text>
          </Box>

          <ShareCardChart
            chart={card.chart}
            theme={theme}
            width={u(PANEL_WIDTH)}
            testID={ShareCardSelectorsIDs.CHART}
          />

          <Box style={{ gap: u(32) }}>
            <Box style={{ paddingHorizontal: u(CONTENT_INSET), gap: u(8) }}>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                style={{ gap: u(16) }}
              >
                <AvatarToken
                  name={card.market.symbol}
                  src={
                    card.market.imageUrl
                      ? { uri: card.market.imageUrl }
                      : undefined
                  }
                  size={AvatarTokenSize.Xs}
                />
                <Text
                  fontWeight={FontWeight.Bold}
                  numberOfLines={1}
                  allowFontScaling={false}
                  style={text.market}
                  testID={ShareCardSelectorsIDs.MARKET}
                >
                  {card.market.detail
                    ? `${card.market.symbol} · ${card.market.detail}`
                    : card.market.symbol}
                </Text>
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.End}
                style={{ gap: u(24) }}
              >
                <Text
                  fontFamily={FontFamily.Hero}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                  allowFontScaling={false}
                  twClassName="shrink"
                  style={text.hero}
                  testID={ShareCardSelectorsIDs.PRIMARY_VALUE}
                >
                  {card.primaryValue}
                </Text>
                <Text
                  fontWeight={FontWeight.Medium}
                  numberOfLines={1}
                  allowFontScaling={false}
                  style={[text.change, { marginBottom: u(20) }]}
                  testID={ShareCardSelectorsIDs.CHANGE}
                >
                  {`${changeGlyph} ${card.changeLabel}`}
                </Text>
              </Box>
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Row}
              style={{ paddingHorizontal: u(CONTENT_INSET), gap: u(48) }}
            >
              {card.stats.slice(0, 2).map((stat) => (
                <Box
                  key={stat.label}
                  twClassName="flex-1"
                  style={{ gap: u(4) }}
                >
                  <Text
                    fontWeight={FontWeight.Medium}
                    numberOfLines={1}
                    allowFontScaling={false}
                    style={text.caption}
                  >
                    {stat.label}
                  </Text>
                  <Text
                    fontWeight={FontWeight.Medium}
                    numberOfLines={1}
                    allowFontScaling={false}
                    style={text.statValue}
                  >
                    {stat.value}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={
            card.promoCode ? BoxJustifyContent.Between : BoxJustifyContent.End
          }
          style={{ height: u(168), paddingRight: u(128) }}
        >
          {card.promoCode ? (
            <Box style={{ gap: u(4) }} testID={ShareCardSelectorsIDs.PROMO}>
              <Text
                fontWeight={FontWeight.Bold}
                allowFontScaling={false}
                style={text.promoCode}
              >
                {card.promoCode}
              </Text>
              {card.promoCaption ? (
                <Text
                  fontWeight={FontWeight.Medium}
                  allowFontScaling={false}
                  style={text.promoCaption}
                >
                  {card.promoCaption}
                </Text>
              ) : null}
            </Box>
          ) : null}
          <MetaMaskWordmark
            name="metamask-wordmark-stacked"
            width={u(LOGO_WIDTH)}
            height={u(LOGO_HEIGHT)}
            color={theme.onAccent}
          />
        </Box>
      </Box>
    </Box>
  );
});

ShareCard.displayName = 'ShareCard';

export default ShareCard;
