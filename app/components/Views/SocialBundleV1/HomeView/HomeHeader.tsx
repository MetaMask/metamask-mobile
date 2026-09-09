import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Image, Pressable } from 'react-native';
import { USER_AVATAR } from '../FeedTab/mocks/assets';

/**
 * Home header row for the SocialBundleV1 prototype: user avatar on the left,
 * heart + plus buttons on the right. All three are `Pressable` no-ops in
 * this PR — Design just wanted them in place for the layout review.
 */
const HomeHeader: React.FC = () => {
  const tw = useTailwind();
  const noop = useCallback(() => undefined, []);
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.SpaceBetween}
      style={tw.style('px-4 pt-3 pb-2 gap-2 bg-background-default')}
    >
      <Pressable onPress={noop} hitSlop={6}>
        <AvatarBase size={AvatarBaseSize.Lg} shape={AvatarBaseShape.Circle}>
          <Image source={USER_AVATAR} style={tw.style('w-full h-full')} />
        </AvatarBase>
      </Pressable>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        style={tw.style('gap-2')}
      >
        <ButtonIcon
          iconName={IconName.Heart}
          size={ButtonIconSize.Md}
          variant={ButtonIconVariant.Secondary}
          onPress={noop}
        />
        <ButtonIcon
          iconName={IconName.Add}
          size={ButtonIconSize.Md}
          variant={ButtonIconVariant.Secondary}
          onPress={noop}
        />
      </Box>
    </Box>
  );
};

export default HomeHeader;
