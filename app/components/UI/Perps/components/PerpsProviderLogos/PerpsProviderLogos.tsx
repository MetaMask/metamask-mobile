import React from 'react';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';

import {
  PERPS_AVAILABLE_BALANCE_LOGO_SIZE,
  PERPS_PROVIDER_LOGO_AVATAR_MAX_PX,
} from '../../constants/perpsUIConfig';
import { PerpsProviderLogosSelectorsIDs } from '../../Perps.testIds';
import { PROVIDER_DISPLAY_INFO } from '../PerpsProviderSelector/PerpsProviderSelector.constants';
import type {
  PerpsProviderLogoId,
  PerpsProviderLogosProps,
} from './PerpsProviderLogos.types';
import hyperliquidLogo from './assets/hyperliquid.png';
import lighterLogo from './assets/lighter.png';

const PROVIDER_LOGOS: Record<PerpsProviderLogoId, number> = {
  // Bundled requires are numbers at runtime. The png declaration is the wider
  // ImageSourcePropType, which AvatarNetwork does not accept.
  hyperliquid: hyperliquidLogo as number,
  lighter: lighterLogo as number,
};

const PROVIDER_LOGO_TEST_IDS: Record<PerpsProviderLogoId, string> = {
  hyperliquid: PerpsProviderLogosSelectorsIDs.HYPERLIQUID,
  lighter: PerpsProviderLogosSelectorsIDs.LIGHTER,
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

/** Later marks paint above earlier ones. Two logos is the maximum. */
const STACKED_LOGO_Z_CLASS = ['z-10', 'z-20'] as const;

export function mapPerpsLogoPixelsToAvatarSize(
  pixels: number,
): AvatarNetworkSize {
  if (pixels <= PERPS_PROVIDER_LOGO_AVATAR_MAX_PX.Xs) {
    return AvatarNetworkSize.Xs;
  }
  if (pixels <= PERPS_PROVIDER_LOGO_AVATAR_MAX_PX.Sm) {
    return AvatarNetworkSize.Sm;
  }
  if (pixels <= PERPS_PROVIDER_LOGO_AVATAR_MAX_PX.Md) {
    return AvatarNetworkSize.Md;
  }
  if (pixels <= PERPS_PROVIDER_LOGO_AVATAR_MAX_PX.Lg) {
    return AvatarNetworkSize.Lg;
  }
  return AvatarNetworkSize.Xl;
}

function logoClassName(
  index: number,
  avatarSize: AvatarNetworkSize,
  isCoveredByNextLogo: boolean,
): string {
  const zClass =
    STACKED_LOGO_Z_CLASS[Math.min(index, STACKED_LOGO_Z_CLASS.length - 1)];
  if (!isCoveredByNextLogo) {
    return zClass;
  }
  return `${STACKED_LOGO_MARGIN_CLASS[avatarSize]} ${zClass}`;
}

/**
 * One exchange mark, or the Hyperliquid and Lighter marks overlapped.
 * The accessible name is the exchange names from PROVIDER_DISPLAY_INFO.
 */
const PerpsProviderLogos: React.FC<PerpsProviderLogosProps> = ({
  providerIds,
  size = PERPS_AVAILABLE_BALANCE_LOGO_SIZE,
  testID = PerpsProviderLogosSelectorsIDs.CONTAINER,
  twClassName,
}) => {
  if (providerIds.length === 0) {
    return null;
  }

  const avatarSize = mapPerpsLogoPixelsToAvatarSize(size);
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
      {providerIds.map((providerId, index) => (
        <AvatarNetwork
          key={providerId}
          name={PROVIDER_DISPLAY_INFO[providerId].name}
          src={PROVIDER_LOGOS[providerId]}
          size={avatarSize}
          accessible={false}
          testID={PROVIDER_LOGO_TEST_IDS[providerId]}
          twClassName={logoClassName(
            index,
            avatarSize,
            index < providerIds.length - 1,
          )}
        />
      ))}
    </Box>
  );
};

export default PerpsProviderLogos;
