import React from 'react';
import { Image } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import limitOrderBannerIcon from './assets/limit-order-banner-icon.png';

export const LIMIT_ORDER_NEW_BANNER_ICON_TEST_ID =
  'limit-order-new-banner-icon';

/**
 * Leading art for the limit-order banner.
 * The image is the full 72pt tile, including its background.
 */
export function LimitOrderNewBannerIcon() {
  const tw = useTailwind();

  return (
    <Box
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={LIMIT_ORDER_NEW_BANNER_ICON_TEST_ID}
      twClassName="h-[72px] w-[72px] shrink-0 grow-0 overflow-hidden rounded-xl"
    >
      <Image
        accessible={false}
        resizeMode="cover"
        source={limitOrderBannerIcon}
        style={tw.style('h-[72px] w-[72px]')}
      />
    </Box>
  );
}
