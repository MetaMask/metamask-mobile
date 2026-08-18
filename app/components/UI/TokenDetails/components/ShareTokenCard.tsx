import React, { useMemo, type ReactElement } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { chunk } from 'lodash';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Badge from '../../../../component-library/components/Badges/Badge';
import metamaskFoxLogo from '../../../../images/branding/fox.png';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import { BadgeVariant } from '../../../../component-library/components/Badges/Badge/Badge.types';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { strings } from '../../../../../locales/i18n';
import { TokenI } from '../../Tokens/types';
import AssetLogo from '../../Assets/components/AssetLogo/AssetLogo';

// Figma share-card palette — fixed dark branding regardless of app theme.
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const CARD_BG = '#0B0B0B';
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const TILE_BG = '#171717';
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const LABEL_TEXT = '#9A9A9A';
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const VALUE_TEXT = '#FFFFFF';
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const POSITIVE_ACCENT = '#00FF88';
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const NEGATIVE_ACCENT = '#FF6B9D';
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const QR_BACKGROUND = '#FFFFFF';

const QR_SIZE = 28;
const STAT_TILES_PER_ROW = 3;

export interface ShareTokenStatTile {
  label: string;
  value?: string | null;
  testID?: string;
}

export interface ShareTokenCardProps {
  token: TokenI;
  shareUrl: string;
  priceChangePercent: number;
  statTiles: ShareTokenStatTile[];
  networkBadgeSource?: ImageSourcePropType;
  networkName?: string;
}

const formatShareCardTimestamp = (): { timeLine: string; dateLine: string } => {
  const now = new Date();

  return {
    timeLine: new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'longOffset',
      hour12: false,
    }).format(now),
    dateLine: new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now),
  };
};

const StatTile = ({ label, value, testID }: ShareTokenStatTile) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="flex-1 rounded-[10px] px-2 py-2.5 min-h-16 justify-between"
      style={tw.style({ backgroundColor: TILE_BG })}
      testID={testID}
    >
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        style={tw.style({ color: LABEL_TEXT })}
      >
        {label}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        twClassName="mt-1"
        style={tw.style({ color: VALUE_TEXT })}
      >
        {value ?? '—'}
      </Text>
    </Box>
  );
};

const QrTile = ({ shareUrl }: { shareUrl: string }) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="flex-1 rounded-[10px] px-1.5 py-2 min-h-16 gap-1"
      style={tw.style({ backgroundColor: TILE_BG })}
      testID="share-token-qr-tile"
    >
      <Box
        twClassName="rounded overflow-hidden p-0.5 shrink-0"
        style={tw.style({ backgroundColor: QR_BACKGROUND })}
      >
        <QRCode
          value={shareUrl}
          size={QR_SIZE}
          backgroundColor={QR_BACKGROUND}
          color="black"
        />
      </Box>
      <Box twClassName="flex-1 min-w-0 justify-center">
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Bold}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={tw.style({ color: VALUE_TEXT })}
        >
          {strings('share_token.buy_on')}
        </Text>
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Bold}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={tw.style({ color: VALUE_TEXT })}
        >
          {strings('share_token.metamask')}
        </Text>
      </Box>
    </Box>
  );
};

const ShareTokenCard = ({
  token,
  shareUrl,
  priceChangePercent,
  statTiles,
  networkBadgeSource,
  networkName,
}: ShareTokenCardProps) => {
  const tw = useTailwind();
  const isPriceUp = priceChangePercent >= 0;
  const accentColor = isPriceUp ? POSITIVE_ACCENT : NEGATIVE_ACCENT;
  const formattedPct = `${isPriceUp ? '+' : ''}${priceChangePercent.toFixed(2)}%`;
  const { timeLine, dateLine } = useMemo(() => formatShareCardTimestamp(), []);

  const gridRows = useMemo(() => {
    const tileNodes: ReactElement[] = [
      ...statTiles.map((tile) => (
        <StatTile
          key={tile.testID ?? tile.label}
          label={tile.label}
          value={tile.value}
          testID={tile.testID}
        />
      )),
      <QrTile key="share-token-qr-tile" shareUrl={shareUrl} />,
    ];

    return chunk(tileNodes, STAT_TILES_PER_ROW);
  }, [statTiles, shareUrl]);

  return (
    <Box
      twClassName="rounded-2xl border px-3.5 pt-3.5 pb-3"
      style={tw.style({
        backgroundColor: CARD_BG,
        borderColor: accentColor,
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
      })}
      testID="share-token-card"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Start}
        twClassName="mb-3"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 mr-2"
        >
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              networkBadgeSource ? (
                <Badge
                  variant={BadgeVariant.Network}
                  imageSource={networkBadgeSource}
                  name={networkName}
                  size={AvatarSize.Xs}
                />
              ) : undefined
            }
          >
            <AssetLogo asset={token} />
          </BadgeWrapper>
          <Box twClassName="flex-1 ml-2.5">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              numberOfLines={1}
              style={tw.style({ color: VALUE_TEXT })}
            >
              {token.name || token.symbol}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              twClassName="uppercase mt-0.5"
              style={tw.style({ color: LABEL_TEXT })}
            >
              {token.symbol}
            </Text>
          </Box>
        </Box>

        <Box twClassName="items-end min-w-[88px]">
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            style={tw.style({ color: accentColor })}
          >
            {formattedPct}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            twClassName="text-right mt-0.5"
            style={tw.style({ color: LABEL_TEXT })}
          >
            {strings('share_token.change_24h')}
          </Text>
        </Box>
      </Box>

      {gridRows.map((row, rowIndex) => (
        <Box
          key={`share-token-grid-row-${rowIndex}`}
          flexDirection={BoxFlexDirection.Row}
          twClassName="gap-1.5 mb-1.5"
        >
          {row}
        </Box>
      ))}

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="mt-4"
      >
        <Box>
          <Text
            variant={TextVariant.BodyXs}
            style={tw.style({ color: LABEL_TEXT })}
          >
            {timeLine}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            style={tw.style({ color: LABEL_TEXT })}
          >
            {dateLine}
          </Text>
        </Box>
        <Image
          source={metamaskFoxLogo}
          style={tw.style('w-9 h-9')}
          resizeMode="contain"
          testID="share-token-fox-logo"
        />
      </Box>
    </Box>
  );
};

export default ShareTokenCard;
