// Third party dependencies.
import React from 'react';

// External dependencies.
import {
  Box,
  BoxAlignItems,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

// Internal dependencies.
import HeaderCompactStandard from '../HeaderCompactStandard';
import { HeaderStandardAnimatedProps } from './HeaderStandardAnimated.types';

const HeaderStandardAnimated: React.FC<HeaderStandardAnimatedProps> = ({
  title,
  titleProps,
  subtitle,
  subtitleProps,
  scrollY,
  titleSectionHeight,
  twClassName = '',
  ...headerStandardProps
}) => {
  const compactTitleProgress = useDerivedValue(() => {
    const hasMeasured = titleSectionHeight.value > 0;
    const isFullyHidden =
      hasMeasured && scrollY.value >= titleSectionHeight.value;
    return withTiming(isFullyHidden ? 1 : 0, { duration: 150 });
  });

  const centerAnimatedStyle = useAnimatedStyle(() => {
    const progress = compactTitleProgress.value;
    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * 8 }],
    };
  });

  const content = title ? (
    <Box alignItems={BoxAlignItems.Center}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        {...titleProps}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          {...subtitleProps}
          twClassName={`-mt-0.5 ${subtitleProps?.twClassName ?? ''}`.trim()}
        >
          {subtitle}
        </Text>
      )}
    </Box>
  ) : null;

  return (
    <HeaderCompactStandard
      {...headerStandardProps}
      twClassName={`bg-default ${twClassName}`.trim()}
    >
      <Animated.View style={centerAnimatedStyle}>{content}</Animated.View>
    </HeaderCompactStandard>
  );
};

export default HeaderStandardAnimated;
