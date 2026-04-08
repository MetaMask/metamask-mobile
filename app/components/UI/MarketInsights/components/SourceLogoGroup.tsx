import React from 'react';
import { Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import type { MarketInsightsSource } from '@metamask/ai-controllers';
import { getFaviconUrl, isXSourceUrl } from '../utils/marketInsightsFormatting';

const MAX_VISIBLE_SOURCE_LOGOS = 3;

interface SourceLogoGroupProps {
  /** Pre-deduplicated sources; only the first MAX_VISIBLE_SOURCE_LOGOS are shown. */
  sources: MarketInsightsSource[];
}

/**
 * Renders a stacked row of up to three circular source logos.
 */
const SourceLogoGroup: React.FC<SourceLogoGroupProps> = ({ sources }) => {
  const tw = useTailwind();
  const visibleLogos = sources.slice(0, MAX_VISIBLE_SOURCE_LOGOS);

  if (visibleLogos.length === 0) {
    return null;
  }

  return (
    <Box flexDirection={BoxFlexDirection.Row}>
      {visibleLogos.map((source, index) => (
        <Box
          key={`${source.name}-${source.url}`}
          twClassName={`h-4 w-4 rounded-full border border-muted bg-default overflow-hidden ${
            index > 0 ? '-ml-1' : ''
          }`}
        >
          {isXSourceUrl(source.url) ? (
            <Box twClassName="h-4 w-4 items-center justify-center rounded-full">
              <Icon
                name={IconName.X}
                size={IconSize.Sm}
                color={IconColor.IconDefault}
              />
            </Box>
          ) : (
            <Image
              source={{ uri: getFaviconUrl(source.url) }}
              style={tw.style('h-4 w-4 rounded-full')}
            />
          )}
        </Box>
      ))}
    </Box>
  );
};

export default SourceLogoGroup;
