/* eslint-disable import-x/no-commonjs, @typescript-eslint/no-require-imports */
import React, { useState } from 'react';
import { Image, Pressable, Share, StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Svg, { Path, SvgXml } from 'react-native-svg';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import {
  Box,
  FontFamily,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MM_FOX } from './assets';
import { formatUsd, type ProtoAvatar } from './fixtures';
import { PALETTE } from './palette';
import { ProtoAvatarCircle } from './components';
import { ConfirmationChime } from './kaching';
import { usePrototypeMotion } from './usePrototypeMotion';

/**
 * North-star share card, "Position · spot, with code · Green → Blue" (1200×630).
 */
const CARD_W = 1200;
const PLATE_X = 40;
const PLATE_Y = 40;
const PLATE_W = 1120;
const PLATE_H = 512;
const CHAMFER_RUN = 112;
const CHAMFER_RISE = 102.4;
const FOOTER_Y = PLATE_Y + PLATE_H + 18;
const CARD_H = FOOTER_Y + 56;
const PLATE_PATH = `M${CHAMFER_RUN} 0H${PLATE_W}V${PLATE_H - CHAMFER_RISE}L${PLATE_W - CHAMFER_RUN} ${PLATE_H}H0V${CHAMFER_RISE}L${CHAMFER_RUN} 0Z`;

const CARD_GRADIENT = require('./assets/share/card-gradient.png');

/** MetaMask wordmark, from the share card's downloaded SVG. */
const WORDMARK_XML = `<svg width="247.805" height="31.7191" viewBox="0 0 247.805 31.7191" fill="none" xmlns="http://www.w3.org/2000/svg"><g><path d="M96.305 24.0074C96.305 28.6641 99.9324 31.7179 105.364 31.7179C108.991 31.7179 111.947 30.3245 113.578 27.958V31.2597H121.409V15.0565C121.409 9.19742 116.918 5.85755 109.106 5.85755C105.114 5.85755 100.911 6.90722 97.6294 8.7012V15.5718C100.758 13.4343 104.846 12.1938 108.607 12.1938C111.39 12.1938 112.887 13.0144 113.329 14.7702L104.5 16.3734C98.992 17.3849 96.2859 19.866 96.2859 24.0074H96.305ZM106.631 21.5836L113.501 20.2667V22.0798C113.501 24.4845 111.352 26.0877 108.185 26.0877C105.901 26.0877 104.404 25.1143 104.404 23.6639C104.404 22.5951 105.172 21.8699 106.631 21.5836Z" fill="black"/><path d="M59.5722 31.7179C63.219 31.7179 67.0382 31.0498 70.4927 29.752V23.1677C67.0767 24.6372 63.7563 25.3243 60.4745 25.3243C55.8682 25.3243 53.1811 23.9883 52.1641 21.221H72.2202V19.5988C72.2202 11.1441 66.808 5.85755 58.229 5.85755C49.65 5.85755 43.9113 11.1632 43.9113 18.9308C43.9113 26.6984 49.8993 31.7179 59.5722 31.7179ZM58.037 12.0411C61.1653 12.0411 63.219 13.5106 64.0059 15.9917H52.0872C52.8934 13.5106 55.0238 12.0411 58.0561 12.0411H58.037Z" fill="black"/><path d="M145.701 16.8703L132.516 0.0182797L123.898 31.2606H132.516L136.335 17.0994L141.824 24.2753H149.558L155.067 17.0994L158.867 31.2606H167.503L158.867 0.0182797L145.701 16.8703Z" fill="black"/><path d="M221.013 2.0964V31.2584H228.939V18.0515V2.0964H221.013Z" fill="black"/><path d="M85.884 0.0190818L72.6221 8.22565V12.8442H77.9768V23.131C77.9768 28.4939 81.7384 31.7191 87.9953 31.7191C90.2407 31.7191 92.2942 31.2612 93.7528 30.4406V23.9899C92.7357 24.6769 91.2962 25.0777 89.7801 25.0777C87.2081 25.0777 85.884 23.799 85.884 21.337V12.8061H94.9042V6.27896H85.884V0V0.0190818Z" fill="black"/><path d="M12.4559 17.0994L17.9448 24.2753H25.641L31.1684 17.0994L34.9492 31.2606H43.6052L34.9492 0.0182797L21.8217 16.8703L8.63656 0.0182797L0 31.2606H8.63656L12.4559 17.0994Z" fill="black"/><path d="M169.786 8.7012V15.5718C172.953 13.4343 177.003 12.1938 180.803 12.1938C183.567 12.1938 185.044 13.0144 185.505 14.7702L176.715 16.3734C171.188 17.3849 168.501 19.866 168.501 24.0074C168.501 28.6641 172.089 31.7179 177.521 31.7179C181.168 31.7179 184.104 30.3245 185.735 27.9771V31.2597H193.566V15.0565C193.566 9.19742 189.075 5.85755 181.263 5.85755C177.31 5.85755 173.068 6.90722 169.786 8.7012ZM180.361 26.0686C178.039 26.0686 176.542 25.0952 176.542 23.6448C176.542 22.576 177.31 21.8508 178.768 21.5645L185.639 20.2476V22.0607C185.639 24.4654 183.49 26.0686 180.361 26.0686Z" fill="black"/><path d="M237.384 6.29741L228.939 18.0538L237.979 31.2606H247.805L237.691 17.5957L246.654 6.29741H237.384Z" fill="black"/><path d="M207.826 11.8512C211.319 11.8512 214.716 12.8436 217.634 14.733V7.72884C214.64 6.46925 211.396 5.83944 207.999 5.83944C200.821 5.83944 196.1 9.10297 196.1 14.1414C196.1 18.0347 198.537 20.4586 203.163 21.1838L208.594 22.0617C210.129 22.2907 210.744 22.7869 210.744 23.7412C210.744 24.9626 209.247 25.6688 206.694 25.6688C202.856 25.6688 199.324 24.6573 196.292 22.577V29.6766C199.343 30.9935 202.952 31.7188 206.445 31.7188C214.045 31.7188 218.67 28.5315 218.67 23.2259C218.67 19.1989 216.252 16.9087 211.108 16.0499L205.869 15.172C204.564 14.943 203.969 14.4849 203.969 13.7215C203.969 12.5001 205.312 11.8512 207.788 11.8512H207.826Z" fill="black"/></g></svg>`;

const CASH_OUT_STAGGER_MS = 120;

const styles = StyleSheet.create({
  fill: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  fox: { height: '100%', width: '100%' },
});

export interface PositionShareModel {
  label: string;
  eventTitle: string;
  color: string;
  avatar?: ProtoAvatar;
  /** Dollars spent on the contracts that were closed. */
  cost: number;
  /** Dollars paid out when the position was cashed out. */
  payout: number;
  code: string;
  /** Contracts closed in this cash-out. */
  contracts: number;
  /** Average price of those contracts, in cents. */
  avgPrice: number;
}

export const shareCode = (eventId: string, price: number) => {
  let hash = price;
  for (let index = 0; index < eventId.length; index += 1) {
    hash = (hash * 33 + eventId.charCodeAt(index)) % 16777216;
  }
  return hash.toString(16).toUpperCase().padStart(6, '0').slice(-6);
};

const shareSummary = (model: PositionShareModel) =>
  `${model.label} · ${model.eventTitle}\nCost ${formatUsd(model.cost)} · Paid out ${formatUsd(model.payout)}\n${model.contracts} contracts at ${model.avgPrice}¢\nCode: ${model.code}`;

/**
 * North-star card at phone width. Coordinates are the 1200-wide frame, scaled
 * so the chamfer, type, and gradient border keep their designed proportions.
 * Cost and paid out are larger than the spot frame's entry and current values.
 */
const PredictShareCard = ({ model }: { model: PositionShareModel }) => {
  const tw = useTailwind();
  const [width, setWidth] = useState(0);
  const profit = model.payout - model.cost;
  const returnPct = model.cost > 0 ? (profit / model.cost) * 100 : 0;
  const isUp = profit >= 0;
  const tone = isUp ? PALETTE.green : PALETTE.red;
  const scale = width > 0 ? width / CARD_W : 0;
  const px = (value: number) => value * scale;

  const at = (x: number, y: number, extra?: Record<string, unknown>) =>
    tw.style('absolute', { left: px(x), top: px(y), ...extra });

  return (
    <Box
      testID="position-share-card"
      twClassName="w-full overflow-hidden"
      style={tw.style({
        aspectRatio: CARD_W / CARD_H,
        borderRadius: px(16),
      })}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        setWidth((current) => (current === next ? current : next));
      }}
    >
      <Image
        source={CARD_GRADIENT}
        accessibilityIgnoresInvertColors
        resizeMode="stretch"
        style={styles.fill}
      />
      <Svg
        width={px(PLATE_W)}
        height={px(PLATE_H)}
        viewBox={`0 0 ${PLATE_W} ${PLATE_H}`}
        style={at(PLATE_X, PLATE_Y)}
      >
        <Path d={PLATE_PATH} fill={PALETTE.kalshiInk} />
      </Svg>
      <View style={at(148, 88, { width: px(96), height: px(96) })}>
        <View
          style={tw.style('absolute overflow-hidden rounded-full', {
            left: px(32),
            top: 0,
            width: px(64),
            height: px(64),
          })}
        >
          <Image
            source={MM_FOX}
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            style={styles.fox}
          />
        </View>
        <View
          style={tw.style('absolute overflow-hidden rounded-full', {
            left: 0,
            top: px(32),
            width: px(64),
            height: px(64),
          })}
        >
          <ProtoAvatarCircle avatar={model.avatar} size={px(64)} />
        </View>
      </View>
      <Text
        numberOfLines={1}
        fontWeight={FontWeight.Bold}
        style={at(268, 98, {
          width: px(520),
          color: PALETTE.white,
          fontSize: px(32),
          lineHeight: px(38),
        })}
      >
        @you
      </Text>
      <Text
        numberOfLines={1}
        style={at(268, 145, {
          width: px(520),
          color: PALETTE.white,
          opacity: 0.75,
          fontSize: px(32),
          lineHeight: px(38),
        })}
      >
        {model.eventTitle}
      </Text>
      <View
        style={at(805, 88, {
          width: px(247),
          height: px(64),
          borderRadius: px(32),
          backgroundColor: PALETTE.white,
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <Text
          fontWeight={FontWeight.Bold}
          style={tw.style({
            color: PALETTE.kalshiInk,
            fontSize: px(28),
            lineHeight: px(34),
          })}
        >
          {`Code: ${model.code}`}
        </Text>
      </View>
      <View
        style={at(148, 252, {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: px(24),
        })}
      >
        <Text
          numberOfLines={1}
          fontFamily={FontFamily.Hero}
          style={tw.style({
            color: tone,
            fontSize: px(88),
            lineHeight: px(88),
            letterSpacing: px(-0.88),
          })}
        >
          {`${isUp ? '+' : '−'}${formatUsd(Math.abs(profit))}`}
        </Text>
        <Text
          fontWeight={FontWeight.Bold}
          style={tw.style({
            color: tone,
            fontSize: px(36),
            lineHeight: px(44),
          })}
        >
          {`${isUp ? '▲' : '▼'} ${Math.abs(returnPct).toFixed(1)}%`}
        </Text>
      </View>
      <Text
        fontWeight={FontWeight.Bold}
        style={at(148, 372, {
          color: PALETTE.white,
          opacity: 0.85,
          fontSize: px(36),
          lineHeight: px(42),
          letterSpacing: px(2.24),
        })}
      >
        COST
      </Text>
      <Text
        fontWeight={FontWeight.Bold}
        style={at(148, 422, {
          color: PALETTE.white,
          fontSize: px(64),
          lineHeight: px(64),
        })}
      >
        {formatUsd(model.cost)}
      </Text>
      <Text
        fontWeight={FontWeight.Bold}
        style={at(548, 372, {
          color: PALETTE.white,
          opacity: 0.85,
          fontSize: px(36),
          lineHeight: px(42),
          letterSpacing: px(2.24),
        })}
      >
        PAID OUT
      </Text>
      <Text
        fontWeight={FontWeight.Bold}
        style={at(548, 422, {
          color: tone,
          fontSize: px(64),
          lineHeight: px(64),
        })}
      >
        {formatUsd(model.payout)}
      </Text>
      <Text
        fontWeight={FontWeight.Medium}
        style={at(148, FOOTER_Y, {
          color: PALETTE.kalshiInk,
          fontSize: px(22),
          lineHeight: px(28),
          letterSpacing: px(1.6),
        })}
      >
        CLOSED POSITION
      </Text>
      <SvgXml
        xml={WORDMARK_XML}
        width={px(248)}
        height={px(32)}
        style={at(912, FOOTER_Y)}
      />
    </Box>
  );
};

const SHARE_ACTIONS: {
  key: 'post' | 'share' | 'link' | 'image' | 'message';
  icon: IconName;
  label: string;
}[] = [
  { key: 'post', icon: IconName.Add, label: 'Post' },
  { key: 'share', icon: IconName.Share, label: 'Share via' },
  { key: 'link', icon: IconName.Link, label: 'Copy link' },
  { key: 'image', icon: IconName.Copy, label: 'Copy image' },
  { key: 'message', icon: IconName.Messages, label: 'Message' },
];

export const PositionOpened = ({
  model,
  onDone,
}: {
  model: PositionShareModel;
  onDone: () => void;
}) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState<'link' | 'image' | null>(null);
  const summary = shareSummary(model);
  const profit = model.payout - model.cost;
  const { shouldAnimate } = usePrototypeMotion();
  const enter = (index: number) =>
    shouldAnimate
      ? FadeInDown.delay(index * CASH_OUT_STAGGER_MS)
          .springify()
          .damping(20)
      : undefined;

  const handleAction = (key: (typeof SHARE_ACTIONS)[number]['key']) => {
    if (key === 'link' || key === 'image') {
      Clipboard.setString(
        key === 'link'
          ? `https://link.metamask.io/predict/${model.code}`
          : summary,
      );
      setCopied(key);
      return;
    }
    Share.share({ message: summary }).catch(() => undefined);
  };

  return (
    <Box
      twClassName="flex-1"
      style={tw.style({ backgroundColor: PALETTE.kalshiInk })}
    >
      <ConfirmationChime />
      <Box
        twClassName="flex-1"
        style={tw.style({
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        })}
      >
        <Box twClassName="flex-1 justify-center gap-6 px-4">
          <Reanimated.View entering={enter(0)}>
            <Box twClassName="items-center gap-1">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                You cashed out
              </Text>
              <Text
                variant={TextVariant.AmountDisplayLg}
                fontFamily={FontFamily.Hero}
              >
                {formatUsd(model.payout)}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={
                  profit >= 0
                    ? TextColor.SuccessDefault
                    : TextColor.ErrorDefault
                }
              >
                {`${profit >= 0 ? '+' : '-'}${formatUsd(Math.abs(profit))} on ${model.label}`}
              </Text>
            </Box>
          </Reanimated.View>
          <Reanimated.View entering={enter(1)}>
            <PredictShareCard model={model} />
          </Reanimated.View>
        </Box>
        <Box twClassName="gap-8 px-4">
          <Box twClassName="flex-row justify-between">
            {SHARE_ACTIONS.map((action) => (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={() => handleAction(action.key)}
                style={tw.style('w-16 items-center gap-2')}
              >
                <Box twClassName="h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Icon
                    name={action.icon}
                    size={IconSize.Md}
                    color={IconColor.IconDefault}
                  />
                </Box>
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                  twClassName="text-center"
                  numberOfLines={2}
                >
                  {copied === action.key ? 'Copied' : action.label}
                </Text>
              </Pressable>
            ))}
          </Box>
          <Pressable
            accessibilityRole="button"
            testID="position-share-next"
            onPress={onDone}
            style={tw.style(
              'h-12 items-center justify-center rounded-full border border-muted',
            )}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              Next
            </Text>
          </Pressable>
        </Box>
      </Box>
    </Box>
  );
};
