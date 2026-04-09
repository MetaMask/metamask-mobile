// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import {
  Box,
  Text,
  ButtonIcon,
  ButtonIconSize,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Internal dependencies.
import { HeaderRootProps } from './HeaderRoot.types';

const HeaderRoot: React.FC<HeaderRootProps> = ({
  children,
  title,
  titleProps,
  titleAccessory,
  endAccessory,
  endButtonIconProps,
  includesTopInset = false,
  style,
  testID,
  twClassName,
  ...viewProps
}) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  const renderEndContent = () => {
    if (endAccessory) {
      return endAccessory;
    }
    if (endButtonIconProps && endButtonIconProps.length > 0) {
      const reversedProps = endButtonIconProps
        .map((props, originalIndex) => ({ props, originalIndex }))
        .reverse();
      return reversedProps.map(({ props, originalIndex }) => (
        <ButtonIcon
          key={`end-button-icon-${originalIndex}`}
          size={ButtonIconSize.Md}
          {...props}
        />
      ));
    }
    return null;
  };

  const hasEndContent =
    endAccessory || (endButtonIconProps && endButtonIconProps.length > 0);

  const renderLeftSection = () => {
    if (children != null && children !== undefined) {
      return children;
    }
    if (title != null || titleAccessory != null) {
      return (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          {title != null && title !== '' && (
            <Text variant={TextVariant.HeadingLg} {...titleProps}>
              {title}
            </Text>
          )}
          {titleAccessory}
        </Box>
      );
    }
    return null;
  };

  return (
    <View
      style={[
        tw.style(
          `flex-row items-center gap-4 min-h-14 pl-4 pr-2 ${twClassName ?? ''}`.trim(),
        ),
        includesTopInset && { marginTop: insets.top },
        style,
      ]}
      testID={testID}
      {...viewProps}
    >
      <Box twClassName="flex-1 items-start">{renderLeftSection()}</Box>
      {hasEndContent && (
        <Box twClassName="flex-row gap-2">{renderEndContent()}</Box>
      )}
    </View>
  );
};

export default HeaderRoot;
