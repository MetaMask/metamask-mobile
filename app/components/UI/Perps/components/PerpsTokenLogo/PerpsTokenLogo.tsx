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

const assetSvgCache = new Map<
  string,
  { svgContent: string | null; valid: boolean }
>();

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

    // Fetch the actual SVG content
    fetch(url)
      .then((response) => {
        if (response.ok) {
          return response.text();
        }
        throw new Error(`HTTP ${response.status}`);
      })
      .then((svgText) => {
        // Check if we actually got SVG content
        if (!svgText.includes('<svg') && !svgText.includes('<?xml')) {
          throw new Error('Invalid SVG content');
        }

        // Clean and adjust the SVG content
        let cleanedSvg = svgText;

        // Convert display-p3 colors to standard RGB
        if (cleanedSvg.includes('display-p3')) {
          // Convert color(display-p3 r g b) to rgb(r, g, b)
          cleanedSvg = cleanedSvg.replace(
            /color\(display-p3\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g,
            (_match, r, g, b) => {
              // Convert from 0-1 range to 0-255 range
              const red = Math.round(parseFloat(r) * 255);
              const green = Math.round(parseFloat(g) * 255);
              const blue = Math.round(parseFloat(b) * 255);
              return `rgb(${red}, ${green}, ${blue})`;
            },
          );
        }

        // Remove filter elements and references as they cause rendering issues
        if (cleanedSvg.includes('filter')) {
          // Remove filter definitions
          cleanedSvg = cleanedSvg.replace(
            /<filter[^>]*>[\s\S]*?<\/filter>/g,
            '',
          );
          // Remove filter attributes
          cleanedSvg = cleanedSvg.replace(/filter="[^"]*"/g, '');
          // Remove filter style properties
          cleanedSvg = cleanedSvg.replace(/filter:[^;]+;?/g, '');
        }

        // Remove mask elements and references
        if (cleanedSvg.includes('mask')) {
          // Remove mask definitions
          cleanedSvg = cleanedSvg.replace(/<mask[^>]*>[\s\S]*?<\/mask>/g, '');
          // Remove mask attributes
          cleanedSvg = cleanedSvg.replace(/mask="[^"]*"/g, '');
          // Remove mask style properties
          cleanedSvg = cleanedSvg.replace(/mask:[^;]+;?/g, '');
        }

        // Fix SVGs with inline styles - React Native SVG doesn't handle CSS classes well
        if (cleanedSvg.includes('<style')) {
          const styleMatch = cleanedSvg.match(
            /<style[^>]*>([\s\S]*?)<\/style>/,
          );
          if (styleMatch) {
            const styles = styleMatch[1];

            // Extract and inline class definitions (handle all class patterns)
            const classRegex = /\.([a-zA-Z0-9\-_]+)\s*\{([^}]+)\}/g;
            let classMatch;
            while ((classMatch = classRegex.exec(styles)) !== null) {
              const className = classMatch[1].trim();
              let classStyle = classMatch[2].trim();

              // Remove clip-path properties as React Native SVG doesn't support them well
              classStyle = classStyle.replace(/clip-path:[^;]+;?/g, '');

              // Only add style if there's something left after removing unsupported properties
              if (classStyle.trim()) {
                // Replace both class="className" and class='className'
                cleanedSvg = cleanedSvg.replace(
                  new RegExp(`class=["']${className}["']`, 'g'),
                  `style="${classStyle}"`,
                );
              } else {
                // Remove the class attribute entirely if no styles remain
                cleanedSvg = cleanedSvg.replace(
                  new RegExp(`class=["']${className}["']`, 'g'),
                  '',
                );
              }
            }

            // Remove the style tag
            cleanedSvg = cleanedSvg.replace(
              /<style[^>]*>[\s\S]*?<\/style>/g,
              '',
            );
          }
        }

        // Remove clipPath elements and references as they cause rendering issues
        if (
          cleanedSvg.includes('clipPath') ||
          cleanedSvg.includes('clip-path')
        ) {
          // Remove clipPath definitions
          cleanedSvg = cleanedSvg.replace(
            /<clipPath[^>]*>[\s\S]*?<\/clipPath>/g,
            '',
          );
          // Remove defs that only contain clipPath
          cleanedSvg = cleanedSvg.replace(/<defs[^>]*>\s*<\/defs>/g, '');
          // Remove clip-path attributes
          cleanedSvg = cleanedSvg.replace(/clip-path="[^"]*"/g, '');
          // Remove clip-path style properties
          cleanedSvg = cleanedSvg.replace(/clip-path:[^;]+;?/g, '');
        }

        // Don't remove width/height - let SvgXml handle scaling with preserveAspectRatio
        // Only ensure viewBox is present if missing (for proper scaling)
        if (!cleanedSvg.includes('viewBox')) {
          const widthMatch = svgText.match(/width="([^"]*)"/);
          const heightMatch = svgText.match(/height="([^"]*)"/);
          if (widthMatch && heightMatch) {
            const width = parseFloat(widthMatch[1]);
            const height = parseFloat(heightMatch[1]);
            cleanedSvg = cleanedSvg.replace(
              '<svg',
              `<svg viewBox="0 0 ${width} ${height}"`,
            );
          }
        }

        assetSvgCache.set(upperSymbol, { svgContent: cleanedSvg, valid: true });
        setSvgContent(cleanedSvg);
        setIsLoading(false);
        setHasError(false);
      })
      .catch(() => {
        assetSvgCache.set(upperSymbol, { svgContent: null, valid: false });
        setIsLoading(false);
        setHasError(true);
      });
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
