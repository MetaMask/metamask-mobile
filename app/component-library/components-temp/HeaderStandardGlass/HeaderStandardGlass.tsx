import React, { useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { NavigationContext } from '@react-navigation/native';
import {
  HeaderStandard,
  type HeaderStandardProps,
} from '@metamask/design-system-react-native';

import HeaderGlass, { type HeaderGlassOptions } from '../HeaderGlass';
import {
  resolveEndAccessoryGlass,
  resolveStartAccessoryGlass,
} from '../HeaderGlass/headerGlassAccessories';
import { useIsNativeHeader } from '../../../components/hooks/useNativeHeader';
import HeaderStandardNative from './HeaderStandardNative';
import { getNativeHeaderConfig } from './headerStandardNativeItems';

export type HeaderStandardGlassProps = HeaderStandardProps &
  HeaderGlassOptions & {
    /** The content's scroll offset; fades the `animated` backdrop in. */
    scrollY?: SharedValue<number>;
  };

/**
 * MMDS `HeaderStandard` floating over the content on a backdrop that fades in
 * with `scrollY`. Back, close and icon props render in glass capsules; custom
 * accessories pass through, so wrap them in `CapsuleGlass`.
 * Pair `onLayout` with `useHeaderGlassInset` to inset the content.
 *
 * On iOS 26 a screen's top header (`includesTopInset`, not floating) with a
 * text title and mappable icons moves into the native bar instead, so its
 * buttons morph between screens. Sheets never pass `includesTopInset`.
 */
const HeaderStandardGlass = ({
  isGlass = true,
  backdrop,
  fadeInDistance,
  isFloating,
  scrollY,
  onLayout,
  ...props
}: HeaderStandardGlassProps) => {
  const navigation = useContext(NavigationContext);
  const isNativeSupported = useIsNativeHeader();
  const nativeConfig =
    isGlass &&
    isNativeSupported &&
    isFloating === false &&
    props.includesTopInset &&
    navigation?.getState()?.type === 'stack'
      ? getNativeHeaderConfig(props)
      : undefined;

  if (nativeConfig) {
    return <HeaderStandardNative config={nativeConfig} />;
  }

  if (!isGlass) {
    return <HeaderStandard {...props} onLayout={onLayout} />;
  }

  return (
    <HeaderGlass
      onLayout={onLayout}
      backdrop={backdrop}
      scrollDistance={scrollY}
      fadeInDistance={fadeInDistance}
      isFloating={isFloating}
    >
      <HeaderStandard
        {...props}
        startAccessory={resolveStartAccessoryGlass(props)}
        endAccessory={resolveEndAccessoryGlass(props)}
      />
    </HeaderGlass>
  );
};

HeaderStandardGlass.displayName = 'HeaderStandardGlass';

export default HeaderStandardGlass;
