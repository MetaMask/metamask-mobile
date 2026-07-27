import React, { useEffect, useMemo } from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  type IconName,
} from '@metamask/design-system-react-native';
import type { TokenAmount } from '../../../util/activity-adapters';
import type { ActivityListItemRowStyles } from './ActivityListItemRow.styles';
import { getTokenImageSource } from './tokenIcon';
import PerpsTokenLogo from '../Perps/components/PerpsTokenLogo';

function getImageUri(
  source: ImageSourcePropType | undefined,
): string | undefined {
  if (source && typeof source === 'object' && 'uri' in source) {
    return source.uri;
  }

  return undefined;
}

function TokenAvatar({
  fallbackIconName,
  isFailed,
  iconUrl,
  perpsMarketSymbol,
  styles,
  tokens,
}: {
  fallbackIconName: IconName;
  isFailed: boolean;
  iconUrl?: string;
  perpsMarketSymbol?: string;
  styles: ActivityListItemRowStyles;
  tokens: TokenAmount[];
}) {
  const tokenImageSources = useMemo(
    () =>
      tokens.map((token, index) =>
        // An explicit iconUrl (HyperLiquid market icon) overrides the
        // token-derived source for the single-avatar case.
        index === 0 && iconUrl ? { uri: iconUrl } : getTokenImageSource(token),
      ),
    [tokens, iconUrl],
  );

  useEffect(() => {
    tokenImageSources.forEach((source) => {
      const uri = getImageUri(source);
      if (uri) {
        Image.prefetch(uri);
      }
    });
  }, [tokenImageSources]);

  if (perpsMarketSymbol) {
    return (
      <PerpsTokenLogo
        symbol={perpsMarketSymbol}
        size={32}
        recyclingKey={perpsMarketSymbol}
      />
    );
  }

  if (tokens.length === 0) {
    if (iconUrl) {
      return <AvatarToken src={{ uri: iconUrl }} size={AvatarTokenSize.Md} />;
    }
    return (
      <AvatarIcon
        iconName={fallbackIconName}
        severity={
          isFailed ? AvatarIconSeverity.Danger : AvatarIconSeverity.Neutral
        }
        size={AvatarIconSize.Md}
      />
    );
  }

  if (tokens.length === 1) {
    const [token] = tokens;
    return (
      <AvatarToken
        name={token.symbol}
        src={tokenImageSources[0]}
        size={AvatarTokenSize.Md}
      />
    );
  }

  const [sourceToken, destinationToken] = tokens;

  return (
    <View style={styles.tokenIconStack}>
      <View style={styles.tokenIconStackBack}>
        <AvatarToken
          name={sourceToken.symbol}
          src={tokenImageSources[0]}
          size={AvatarTokenSize.Md}
        />
      </View>
      <View style={styles.tokenIconStackFront}>
        <AvatarToken
          name={destinationToken.symbol}
          src={tokenImageSources[1]}
          size={AvatarTokenSize.Md}
          style={styles.tokenIconStackFrontImage}
        />
      </View>
      <View style={styles.tokenIconStackDivider} />
    </View>
  );
}

export function ActivityListItemRowIcon({
  fallbackIconName,
  isFailed = false,
  iconUrl,
  networkImageSource,
  perpsMarketSymbol,
  styles,
  tokens,
}: {
  /** Design-system arrow icon shown when the row has no token avatar. */
  fallbackIconName: IconName;
  /** Renders the fallback icon in the danger (failed) severity. */
  isFailed?: boolean;
  /** Explicit avatar image URL (e.g. HyperLiquid market icon) for the single-avatar case. */
  iconUrl?: string;
  /**
   * Network badge source. Omitted for single-network domains (perps =
   * Arbitrum, predict = Polygon) where the badge adds no information, so the
   * avatar renders without it.
   */
  networkImageSource?: ImageSourcePropType;
  perpsMarketSymbol?: string;
  styles: ActivityListItemRowStyles;
  tokens: TokenAmount[];
}) {
  useEffect(() => {
    const uri = getImageUri(networkImageSource);
    if (uri) {
      Image.prefetch(uri);
    }
  }, [networkImageSource]);

  const avatar = (
    <TokenAvatar
      fallbackIconName={fallbackIconName}
      isFailed={isFailed}
      iconUrl={iconUrl}
      perpsMarketSymbol={perpsMarketSymbol}
      styles={styles}
      tokens={tokens}
    />
  );

  if (!networkImageSource) {
    return avatar;
  }

  return (
    <BadgeWrapper
      position={BadgeWrapperPosition.BottomRight}
      badge={
        <BadgeNetwork
          twClassName="rounded-md"
          src={
            networkImageSource as React.ComponentProps<
              typeof BadgeNetwork
            >['src']
          }
        />
      }
    >
      {avatar}
    </BadgeWrapper>
  );
}
