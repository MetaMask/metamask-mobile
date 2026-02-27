// Third party dependencies.
import React, { useMemo } from 'react';

// External dependencies.
import {
  Box,
  BoxAlignItems,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  IconName,
  ButtonIconProps,
} from '@metamask/design-system-react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

// Internal dependencies.
import HeaderBase from '../../components/HeaderBase';
import { HeaderStandardAnimatedProps } from './HeaderStandardAnimated.types';

const HeaderStandardAnimated: React.FC<HeaderStandardAnimatedProps> = ({
  title,
  titleProps,
  subtitle,
  subtitleProps,
  children,
  onBack,
  backButtonProps,
  onClose,
  closeButtonProps,
  endButtonIconProps,
  startButtonIconProps,
  scrollY,
  titleSectionHeight,
  twClassName = '',
  testID,
  ...headerBaseProps
}) => {
  const resolvedStartButtonIconProps = useMemo(() => {
    if (startButtonIconProps) {
      return startButtonIconProps;
    }
    if (onBack || backButtonProps) {
      return {
        iconName: IconName.ArrowLeft,
        ...(backButtonProps || {}),
        onPress: backButtonProps?.onPress ?? onBack,
      } as ButtonIconProps;
    }
    return undefined;
  }, [onBack, backButtonProps, startButtonIconProps]);

  const resolvedEndButtonIconProps = useMemo(() => {
    const props: ButtonIconProps[] = [];

    if (onClose || closeButtonProps) {
      const closeProps: ButtonIconProps = {
        iconName: IconName.Close,
        ...(closeButtonProps || {}),
        onPress: closeButtonProps?.onPress ?? onClose,
      };
      props.push(closeProps);
    }

    if (endButtonIconProps) {
      props.push(...endButtonIconProps);
    }
    return props.length > 0 ? props : undefined;
  }, [endButtonIconProps, onClose, closeButtonProps]);

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

  const renderContent = () => {
    if (children) {
      return children;
    }
    if (title) {
      return (
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
      );
    }
    return null;
  };

  return (
    <HeaderBase
      testID={testID}
      startButtonIconProps={resolvedStartButtonIconProps}
      endButtonIconProps={resolvedEndButtonIconProps}
      {...headerBaseProps}
      twClassName={`bg-default px-2 ${twClassName}`.trim()}
    >
      <Animated.View style={centerAnimatedStyle}>
        {renderContent()}
      </Animated.View>
    </HeaderBase>
  );
};

export default HeaderStandardAnimated;
