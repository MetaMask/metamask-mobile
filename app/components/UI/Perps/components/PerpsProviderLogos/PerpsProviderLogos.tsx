import React, { useMemo } from 'react';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import type { PerpsActiveProviderMode } from '@metamask/perps-controller';

import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import { PROVIDER_DISPLAY_INFO } from '../PerpsProviderSelector/PerpsProviderSelector.constants';
import type {
  PerpsProviderLogoId,
  PerpsProviderLogosProps,
} from './PerpsProviderLogos.types';
import hyperliquidLogo from './assets/hyperliquid.png';
import lighterLogo from './assets/lighter.png';

/** Diameter of the marks beside "$X available" on Perps home. */
export const PERPS_AVAILABLE_BALANCE_LOGO_SIZE = 16;

export const PERPS_PROVIDER_LOGOS_TEST_ID = 'perps-provider-logos';

const NO_PROVIDER_LOGOS: readonly PerpsProviderLogoId[] = [];

/**
 * Hyperliquid then Lighter, matching the stacked pair on Perps Home.
 * The later mark paints on top.
 */
const AGGREGATED_PROVIDER_LOGO_IDS: readonly PerpsProviderLogoId[] = [
  'hyperliquid',
  'lighter',
];

const PROVIDER_LOGOS: Record<PerpsProviderLogoId, number> = {
  // Bundled requires are numbers at runtime. The png declaration is the wider
  // ImageSourcePropType, which AvatarNetwork does not accept.
  hyperliquid: hyperliquidLogo as number,
  lighter: lighterLogo as number,
};

/**
 * Overlap for a stacked pair. 6px at 16px matches the home design and
 * AvatarGroup's xs spacing. AvatarGroup itself always sets hasBorder, which
 * grows a 16px avatar to 18px, so these marks are composed from AvatarNetwork.
 */
const STACKED_LOGO_MARGIN_CLASS: Record<AvatarNetworkSize, string> = {
  [AvatarNetworkSize.Xs]: '-mr-1.5',
  [AvatarNetworkSize.Sm]: '-mr-2.5',
  [AvatarNetworkSize.Md]: '-mr-3.5',
  [AvatarNetworkSize.Lg]: '-mr-4',
  [AvatarNetworkSize.Xl]: '-mr-5',
};

function mapToAvatarNetworkSize(pixels: number): AvatarNetworkSize {
  if (pixels <= 16) return AvatarNetworkSize.Xs;
  if (pixels <= 24) return AvatarNetworkSize.Sm;
  if (pixels <= 32) return AvatarNetworkSize.Md;
  if (pixels <= 40) return AvatarNetworkSize.Lg;
  return AvatarNetworkSize.Xl;
}

/**
 * Marks for the active provider. Aggregated mode draws both exchanges.
 * Returns an empty list for an unknown provider.
 */
export function getPerpsProviderLogoIds(
  activeProvider: PerpsActiveProviderMode | undefined,
): readonly PerpsProviderLogoId[] {
  switch (activeProvider) {
    case 'hyperliquid':
      return ['hyperliquid'];
    case 'lighter':
      return ['lighter'];
    case 'aggregated':
      return AGGREGATED_PROVIDER_LOGO_IDS;
    default:
      return NO_PROVIDER_LOGOS;
  }
}

/**
 * Logo ids for the available-balance row. Empty when the Lighter flag is off,
 * so callers render nothing and keep the single-provider layout.
 */
export function usePerpsProviderLogoIds(): readonly PerpsProviderLogoId[] {
  const { activeProvider, isMultiProviderEnabled } = usePerpsProvider();

  return useMemo(() => {
    if (!isMultiProviderEnabled) {
      return NO_PROVIDER_LOGOS;
    }

    return getPerpsProviderLogoIds(activeProvider);
  }, [activeProvider, isMultiProviderEnabled]);
}

/**
 * One exchange mark, or the Hyperliquid and Lighter marks overlapped.
 * The accessible name is the exchange names from PROVIDER_DISPLAY_INFO.
 */
const PerpsProviderLogos: React.FC<PerpsProviderLogosProps> = ({
  providerIds,
  size = PERPS_AVAILABLE_BALANCE_LOGO_SIZE,
  testID = PERPS_PROVIDER_LOGOS_TEST_ID,
  twClassName,
}) => {
  if (providerIds.length === 0) {
    return null;
  }

  const avatarSize = mapToAvatarNetworkSize(size);
  const accessibilityLabel = providerIds
    .map((providerId) => PROVIDER_DISPLAY_INFO[providerId].name)
    .join(', ');

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      twClassName={twClassName}
    >
      {providerIds.map((providerId, index) => {
        const isCoveredByNextLogo = index < providerIds.length - 1;

        return (
          <AvatarNetwork
            key={providerId}
            name={PROVIDER_DISPLAY_INFO[providerId].name}
            src={PROVIDER_LOGOS[providerId]}
            size={avatarSize}
            accessible={false}
            testID={`${testID}-${providerId}`}
            twClassName={
              isCoveredByNextLogo
                ? STACKED_LOGO_MARGIN_CLASS[avatarSize]
                : undefined
            }
            style={{ zIndex: index + 1 }}
          />
        );
      })}
    </Box>
  );
};

export default PerpsProviderLogos;
