import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';

import { useTheme } from '../../../../../util/theme';
import { PROVIDER_CONFIG } from '../../constants/perpsConfig';
import { PERPS_AVAILABLE_BALANCE_LOGO_SIZE } from '../../constants/perpsUIConfig';
import type { PerpsProviderLogoId } from '../../hooks/usePerpsProviderLogoIds';
import { PerpsProviderLogosSelectorsIDs } from '../../Perps.testIds';
import { PROVIDER_DISPLAY_INFO } from '../PerpsProviderSelector/PerpsProviderSelector.constants';
import type { PerpsProviderLogosProps } from './PerpsProviderLogos.types';
import { VENUE_DISPLAY } from './venueDisplay';

const PROVIDER_LOGO_TEST_IDS: Record<PerpsProviderLogoId, string> = {
  [PROVIDER_CONFIG.DefaultProvider]: PerpsProviderLogosSelectorsIDs.HYPERLIQUID,
  [PROVIDER_CONFIG.LighterProvider]: PerpsProviderLogosSelectorsIDs.LIGHTER,
};

function isDrawableLogoId(
  providerId: string,
): providerId is PerpsProviderLogoId {
  return Object.prototype.hasOwnProperty.call(VENUE_DISPLAY, providerId);
}

/**
 * Corner radius of a venue mark. The designs draw squared marks: 2px on a
 * 12px badge, 8px on a 40px badge — a fifth of the mark's size.
 */
const VENUE_MARK_RADIUS_RATIO = 0.2;

/**
 * Overlap of a stacked pair as a share of the mark size. 6px at 16px matches
 * the home design; scaled, it keeps the pair proportional at
 * every size.
 */
const VENUE_MARK_OVERLAP_RATIO = 0.4;

const markRadiusPx = (size: number): number =>
  Math.max(2, Math.round(size * VENUE_MARK_RADIUS_RATIO));

const stackedOverlapPx = (size: number): number =>
  Math.round(size * VENUE_MARK_OVERLAP_RATIO);

const markStyle = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  // Clips the mark image to the squared corner radius.
  clip: { overflow: 'hidden' as const },
});

/** Later marks paint above earlier ones. Two logos is the maximum. */
const STACKED_LOGO_Z_CLASS = ['z-10', 'z-20'] as const;

/**
 * One exchange mark, or the Hyperliquid and Lighter marks overlapped.
 * Marks are squared with a hairline border, per the designs (2px radius on
 * a 12px badge, 8px on 40px). The accessible name is the exchange names
 * from PROVIDER_DISPLAY_INFO.
 */
const PerpsProviderLogos: React.FC<PerpsProviderLogosProps> = ({
  providerIds,
  size = PERPS_AVAILABLE_BALANCE_LOGO_SIZE,
  isDecorative = false,
  testID = PerpsProviderLogosSelectorsIDs.CONTAINER,
  twClassName,
}) => {
  const { colors } = useTheme();
  const drawableIds = providerIds.filter(isDrawableLogoId);
  if (drawableIds.length === 0) {
    return null;
  }

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
      className={twClassName}
    >
      {drawableIds.map((providerId, index) => {
        const isCoveredByNextLogo = index < drawableIds.length - 1;
        const zClass =
          STACKED_LOGO_Z_CLASS[
            Math.min(index, STACKED_LOGO_Z_CLASS.length - 1)
          ];
        return (
          <Box
            key={providerId}
            accessible={false}
            testID={PROVIDER_LOGO_TEST_IDS[providerId]}
            className={zClass}
            style={[
              markStyle.clip,
              {
                width: size,
                height: size,
                borderRadius: markRadiusPx(size),
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border.muted,
                ...(isCoveredByNextLogo
                  ? { marginRight: -stackedOverlapPx(size) }
                  : {}),
              },
            ]}
          >
            <Image
              source={VENUE_DISPLAY[providerId].logo}
              style={markStyle.fill}
              contentFit="cover"
              cachePolicy="memory-disk"
              allowDownscaling={false}
              transition={0}
              placeholder={null}
              autoplay={false}
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default PerpsProviderLogos;
