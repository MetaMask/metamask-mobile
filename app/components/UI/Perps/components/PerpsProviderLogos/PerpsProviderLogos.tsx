import React from 'react';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';

import { PROVIDER_CONFIG } from '../../constants/perpsConfig';
import {
  PERPS_AVAILABLE_BALANCE_LOGO_SIZE,
  PERPS_PROVIDER_LOGO_AVATAR_MAX_PX,
} from '../../constants/perpsUIConfig';
import type { PerpsProviderLogoId } from '../../hooks/usePerpsProviderLogoIds';
import { PerpsProviderLogosSelectorsIDs } from '../../Perps.testIds';
import { PROVIDER_DISPLAY_INFO } from '../PerpsProviderSelector/PerpsProviderSelector.constants';
import type { PerpsProviderLogosProps } from './PerpsProviderLogos.types';
import hyperliquidLogo from './assets/hyperliquid.png';
import lighterLogo from './assets/lighter.png';

const PROVIDER_LOGOS: Record<PerpsProviderLogoId, number> = {
  // Bundled requires are numbers at runtime. The png declaration is the wider
  // ImageSourcePropType, which AvatarNetwork does not accept.
  [PROVIDER_CONFIG.DefaultProvider]: hyperliquidLogo as number,
  [PROVIDER_CONFIG.LighterProvider]: lighterLogo as number,
};

const PROVIDER_LOGO_TEST_IDS: Record<PerpsProviderLogoId, string> = {
  [PROVIDER_CONFIG.DefaultProvider]: PerpsProviderLogosSelectorsIDs.HYPERLIQUID,
  [PROVIDER_CONFIG.LighterProvider]: PerpsProviderLogosSelectorsIDs.LIGHTER,
};

function isDrawableLogoId(
  providerId: string,
): providerId is PerpsProviderLogoId {
  return Object.prototype.hasOwnProperty.call(PROVIDER_LOGOS, providerId);
}

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
  isDecorative = false,
  testID = PerpsProviderLogosSelectorsIDs.CONTAINER,
  twClassName,
}) => {
  const drawableIds = providerIds.filter(isDrawableLogoId);
  if (drawableIds.length === 0) {
    return null;
  }

  const avatarSize = mapPerpsLogoPixelsToAvatarSize(size);
  const accessibilityLabel = drawableIds
    .map((providerId) => PROVIDER_DISPLAY_INFO[providerId].name)
    .join(', ');

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      accessible={!isDecorative}
      accessibilityRole={isDecorative ? undefined : 'image'}
      accessibilityLabel={isDecorative ? undefined : accessibilityLabel}
      importantForAccessibility={isDecorative ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={isDecorative}
      testID={testID}
      twClassName={twClassName}
    >
      {drawableIds.map((providerId, index) => (
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
            index < drawableIds.length - 1,
          )}
        />
      ))}
    </Box>
  );
};

export default PerpsProviderLogos;
