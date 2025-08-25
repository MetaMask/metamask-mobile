import React, { memo, useEffect, useState, useMemo } from 'react';
import { View, ActivityIndicator, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { useTheme } from '../../../../../util/theme';
import { PerpsTokenLogoProps } from './PerpsTokenLogo.types';
import { HYPERLIQUID_ASSET_ICONS_BASE_URL } from '../../constants/hyperLiquidConfig';
import {
  transformSvgForReactNative,
  isValidSvgContent,
} from '../../utils/svgTransform';

const assetSvgCache = new Map<
  string,
  { svgContent: string | null; valid: boolean }
>();

// Maximum number of SVGs to cache in memory
// Set to 250 to accommodate all ~200 markets with some buffer
const MAX_CACHE_SIZE = 250;

const PerpsTokenLogo: React.FC<PerpsTokenLogoProps> = ({
  symbol,
  size = 32,
  style,
  testID,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  const containerStyle: ViewStyle = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.background.default,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
    }),
    [size, colors.background.default],
  );

  useEffect(() => {
    if (!symbol) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    const upperSymbol = symbol.toUpperCase();
    const cached = assetSvgCache.get(upperSymbol);

    if (cached) {
      if (cached.valid && cached.svgContent) {
        setSvgContent(cached.svgContent);
        setIsLoading(false);
        setHasError(false);
      } else {
        setIsLoading(false);
        setHasError(true);
      }
      return;
    }

    const url = `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${upperSymbol}.svg`;

    // Create an AbortController to cancel the fetch if the component unmounts or symbol changes
    const abortController = new AbortController();

    // Fetch the actual SVG content
    fetch(url, { signal: abortController.signal })
      .then((response) => {
        if (response.ok) {
          return response.text();
        }
        throw new Error(`HTTP ${response.status}`);
      })
      .then((svgText) => {
        // Check if we actually got SVG content
        if (!isValidSvgContent(svgText)) {
          throw new Error('Invalid SVG content');
        }

        // Transform SVG for React Native compatibility
        const cleanedSvg = transformSvgForReactNative(svgText);

        // Implement simple FIFO cache eviction if cache is too large
        if (assetSvgCache.size >= MAX_CACHE_SIZE) {
          const firstKey = assetSvgCache.keys().next().value;
          if (firstKey) {
            assetSvgCache.delete(firstKey);
          }
        }
        assetSvgCache.set(upperSymbol, { svgContent: cleanedSvg, valid: true });
        setSvgContent(cleanedSvg);
        setIsLoading(false);
        setHasError(false);
      })
      .catch((error) => {
        // Don't update state if the request was aborted
        if (error.name === 'AbortError') {
          return;
        }
        assetSvgCache.set(upperSymbol, { svgContent: null, valid: false });
        setIsLoading(false);
        setHasError(true);
      });

    // Cleanup function to abort the fetch if the component unmounts or symbol changes
    return () => {
      abortController.abort();
    };
  }, [symbol]);

  if (isLoading) {
    return (
      <View style={[containerStyle, style]} testID={testID}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (hasError || !svgContent) {
    return (
      <Avatar
        variant={AvatarVariant.Token}
        name={symbol}
        size={
          size === 32
            ? AvatarSize.Md
            : size === 40
            ? AvatarSize.Lg
            : AvatarSize.Md
        }
        style={style}
        testID={testID}
      />
    );
  }

  return (
    <View style={[containerStyle, style]} testID={testID}>
      <SvgXml
        xml={svgContent}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        onError={() => {
          setHasError(true);
        }}
      />
    </View>
  );
};

export default memo(PerpsTokenLogo);
