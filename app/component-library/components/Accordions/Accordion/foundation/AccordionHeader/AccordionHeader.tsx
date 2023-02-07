/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Icon, { IconSize, IconName } from '../../../../Icon';
import Text, { TextVariant } from '../../../../Texts/Text';
import { ACCORDION_EXPAND_TRANSITION_DURATION } from '../../Accordion.constants';

// Internal dependencies.
import styleSheet from './AccordionHeader.styles';
import { AccordionHeaderProps } from './AccordionHeader.types';
import {
  ACCORDION_HEADER_TEST_ID,
  ACCORDION_HEADER_TITLE_TEST_ID,
  ACCORDION_HEADER_ARROW_ICON_TEST_ID,
  ACCORDION_HEADER_ARROW_ICON_ANIMATION_TEST_ID,
} from './AccordionHeader.constants';

const AccordionHeader = ({
  style,
  title,
  isExpanded = false,
  onPress,
}: AccordionHeaderProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const rotation = useSharedValue(isExpanded ? 180 : 0);
  const animatedStyles = useAnimatedStyle(
    () => ({
      transform: [
        {
          rotate: `${rotation.value}deg`,
        },
      ],
    }),
    [rotation.value],
  );

  const onHeaderPressed = () => {
    rotation.value = withTiming(rotation.value + 180, {
      duration: ACCORDION_EXPAND_TRANSITION_DURATION,
      easing: Easing.linear,
    });
    onPress?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.5}
      onPress={onHeaderPressed}
      style={styles.base}
      testID={ACCORDION_HEADER_TEST_ID}
    >
      <Text
        variant={TextVariant.BodyMD}
        style={styles.title}
        testID={ACCORDION_HEADER_TITLE_TEST_ID}
      >
        {title}
      </Text>
      <Animated.View
        style={[styles.arrowContainer, animatedStyles]}
        testID={ACCORDION_HEADER_ARROW_ICON_ANIMATION_TEST_ID}
      >
        <Icon
          name={IconName.ArrowUpOutline}
          size={IconSize.Sm}
          color={styles.title.color}
          testID={ACCORDION_HEADER_ARROW_ICON_TEST_ID}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default AccordionHeader;
