import React, { useMemo } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Badge from '../../../../component-library/components/Badges/Badge';
import metamaskFoxLogo from '../../../../images/branding/fox.png';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import { BadgeVariant } from '../../../../component-library/components/Badges/Badge/Badge.types';
import { strings } from '../../../../../locales/i18n';
import { TokenI } from '../../Tokens/types';
import NetworkAssetLogo from '../../NetworkAssetLogo';
import { getFallbackAssetImageUrls } from '../../Assets/components/AssetLogo/AssetLogo.utils';
import { useSmartImageFallback } from '../../Assets/components/AssetLogo/AssetLogo.hook';

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

const QR_SIZE = 36;
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const QR_BACKGROUND = '#FFFFFF';

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  cardShadow: Platform.select({
    ios: {
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
    android: {
      elevation: 6,
    },
    default: {},
  }),
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tokenIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  tokenMeta: {
    flex: 1,
    marginLeft: 10,
  },
  tokenName: {
    color: VALUE_TEXT,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  tokenSymbol: {
    color: LABEL_TEXT,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  changeColumn: {
    alignItems: 'flex-end',
    minWidth: 88,
  },
  changeValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  changeLabel: {
    color: LABEL_TEXT,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'right',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  statTile: {
    flex: 1,
    backgroundColor: TILE_BG,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 64,
    justifyContent: 'space-between',
  },
  statLabel: {
    color: LABEL_TEXT,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },
  statValue: {
    color: VALUE_TEXT,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 16,
    marginTop: 4,
  },
  qrTile: {
    flex: 1,
    backgroundColor: TILE_BG,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },
  qrWrapper: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: QR_BACKGROUND,
    padding: 2,
    flexShrink: 0,
  },
  buyLabelWrap: {
    flex: 1,
    marginLeft: 6,
    justifyContent: 'center',
  },
  buyLabel: {
    color: VALUE_TEXT,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  timestamp: {
    color: LABEL_TEXT,
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
  },
  foxLogo: {
    width: 36,
    height: 36,
  },
});

export interface ShareTokenCardProps {
  token: TokenI;
  shareUrl: string;
  priceChangePercent: number;
  formattedPrice: string;
  marketCap: string | null;
  liquidity: string | null;
  holdersCount: string | null;
  volume24h: string | null;
  networkBadgeSource?: ImageSourcePropType;
  networkName?: string;
}

const formatShareCardTimestamp = (): { timeLine: string; dateLine: string } => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absOffset / 60)
    .toString()
    .padStart(2, '0');
  const offsetMins = (absOffset % 60).toString().padStart(2, '0');

  return {
    timeLine: `${hours}:${minutes} (GMT${sign}${offsetHours}:${offsetMins})`,
    dateLine: [
      now.getDate().toString().padStart(2, '0'),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getFullYear(),
    ].join('/'),
  };
};

const ShareTokenCardAvatar = ({
  token,
  networkBadgeSource,
  networkName,
}: {
  token: TokenI;
  networkBadgeSource?: ImageSourcePropType;
  networkName?: string;
}) => {
  const images = useMemo(
    () =>
      [
        token.image,
        ...(getFallbackAssetImageUrls(token.chainId, token.address) ?? []),
      ]
        .filter((image): image is string => Boolean(image))
        .map((image) => ({ uri: image })),
    [token.image, token.chainId, token.address],
  );
  const { source, onError, uniqueSourceImageKey } =
    useSmartImageFallback(images);

  const avatar =
    token.isNative || token.isETH ? (
      <NetworkAssetLogo
        chainId={token.chainId as string}
        ticker={token.ticker ?? token.symbol}
        style={styles.avatarImage}
        big={false}
        biggest={false}
      />
    ) : (
      <AvatarToken
        key={uniqueSourceImageKey}
        name={token.symbol}
        src={source}
        size={AvatarTokenSize.Md}
        imageOrSvgProps={{ imageProps: { onError } }}
      />
    );

  if (!networkBadgeSource) {
    return avatar;
  }

  return (
    <BadgeWrapper
      badgePosition={BadgePosition.BottomRight}
      badgeElement={
        <Badge
          variant={BadgeVariant.Network}
          imageSource={networkBadgeSource}
          name={networkName}
        />
      }
    >
      {avatar}
    </BadgeWrapper>
  );
};

interface StatTileProps {
  label: string;
  value: string | null;
  testID?: string;
}

const StatTile = ({ label, value, testID }: StatTileProps) => (
  <View style={styles.statTile} testID={testID}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text
      style={styles.statValue}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
    >
      {value ?? '—'}
    </Text>
  </View>
);

const ShareTokenCard = ({
  token,
  shareUrl,
  priceChangePercent,
  formattedPrice,
  marketCap,
  liquidity,
  holdersCount,
  volume24h,
  networkBadgeSource,
  networkName,
}: ShareTokenCardProps) => {
  const isPriceUp = priceChangePercent >= 0;
  const accentColor = isPriceUp ? POSITIVE_ACCENT : NEGATIVE_ACCENT;
  const formattedPct = `${isPriceUp ? '+' : ''}${priceChangePercent.toFixed(2)}%`;
  const { timeLine, dateLine } = useMemo(() => formatShareCardTimestamp(), []);

  return (
    <View
      style={[
        styles.card,
        styles.cardShadow,
        {
          borderColor: accentColor,
          shadowColor: accentColor,
        },
      ]}
      testID="share-token-card"
    >
      <View style={styles.headerRow}>
        <View style={styles.tokenIdentity}>
          <ShareTokenCardAvatar
            token={token}
            networkBadgeSource={networkBadgeSource}
            networkName={networkName}
          />
          <View style={styles.tokenMeta}>
            <Text style={styles.tokenName} numberOfLines={1}>
              {token.name || token.symbol}
            </Text>
            <Text style={styles.tokenSymbol} numberOfLines={1}>
              {token.symbol}
            </Text>
          </View>
        </View>

        <View style={styles.changeColumn}>
          <Text style={[styles.changeValue, { color: accentColor }]}>
            {formattedPct}
          </Text>
          <Text style={styles.changeLabel}>
            {strings('share_token.change_24h')}
          </Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        <StatTile
          label={strings('share_token.market_cap')}
          value={marketCap}
          testID="share-token-market-cap"
        />
        <StatTile
          label={strings('share_token.price')}
          value={formattedPrice}
          testID="share-token-price"
        />
        <StatTile
          label={strings('share_token.liquidity')}
          value={liquidity}
          testID="share-token-liquidity"
        />
      </View>

      <View style={styles.gridRow}>
        <StatTile
          label={strings('share_token.holders')}
          value={holdersCount}
          testID="share-token-holders"
        />
        <StatTile
          label={strings('share_token.volume_24h')}
          value={volume24h}
          testID="share-token-volume"
        />
        <View style={styles.qrTile} testID="share-token-qr-tile">
          <View style={styles.qrWrapper}>
            <QRCode
              value={shareUrl}
              size={QR_SIZE}
              backgroundColor={QR_BACKGROUND}
              color="black"
            />
          </View>
          <View style={styles.buyLabelWrap}>
            <Text style={styles.buyLabel} numberOfLines={1}>
              {strings('share_token.buy_on')}
            </Text>
            <Text style={styles.buyLabel} numberOfLines={1}>
              {strings('share_token.metamask')}
            </Text>
          </View>
        </View>
      </View>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="mt-4"
      >
        <View>
          <Text style={styles.timestamp}>{timeLine}</Text>
          <Text style={styles.timestamp}>{dateLine}</Text>
        </View>
        <Image
          source={metamaskFoxLogo}
          style={styles.foxLogo}
          resizeMode="contain"
          testID="share-token-fox-logo"
        />
      </Box>
    </View>
  );
};

export default ShareTokenCard;
