import { Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { NativeTabBarIcon } from './types';

const ANDROID_ICON_SIZE = 24;
// Android image sources are tinted by the system; black is the neutral base.
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const ANDROID_ICON_COLOR = '#000000';

function androidImageSource(
  name: string,
  set: 'material' | 'community' = 'material',
) {
  const IconSet = set === 'community' ? MaterialCommunityIcons : MaterialIcons;
  return IconSet.getImageSourceSync(
    name,
    ANDROID_ICON_SIZE,
    ANDROID_ICON_COLOR,
  );
}

/**
 * Builds a cross-platform native tab icon (SF Symbol on iOS, image on Android).
 */
export function nativeTabIcon(
  sfSymbol: string,
  androidIconName: string,
  androidSet: 'material' | 'community' = 'material',
): NativeTabBarIcon {
  if (Platform.OS === 'ios') {
    return { type: 'sfSymbol', name: sfSymbol };
  }

  return {
    type: 'imageSource',
    imageSource: androidImageSource(androidIconName, androidSet),
  };
}

export const HOME_TAB_ICONS = {
  home: () => nativeTabIcon('house', 'home'),
  homeSelected: () => nativeTabIcon('house.fill', 'home'),
  trade: () => nativeTabIcon('plus.circle', 'add-circle-outline'),
  tradeSelected: () => nativeTabIcon('plus.circle.fill', 'add-circle'),
  explore: () => nativeTabIcon('magnifyingglass', 'search'),
  exploreSelected: () => nativeTabIcon('magnifyingglass', 'search'),
  money: () => nativeTabIcon('dollarsign.circle', 'attach-money'),
  moneySelected: () => nativeTabIcon('dollarsign.circle.fill', 'attach-money'),
  rewards: () => nativeTabIcon('gift', 'card-giftcard'),
  rewardsSelected: () => nativeTabIcon('gift.fill', 'card-giftcard'),
} as const;
