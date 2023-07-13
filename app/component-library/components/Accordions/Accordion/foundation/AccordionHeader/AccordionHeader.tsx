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
import Icon, { IconSize, IconName } from '../../../../Icons/Icon';
import Text, { TextVariant } from '../../../../Texts/Text';
import { ACCORDION_EXPAND_TRANSITION_DURATION } from '../../Accordion.constants';

// Internal dependencies.
import styleSheet from './AccordionHeader.styles';
import { AccordionHeaderProps } from './AccordionHeader.types';
import {
  TESTID_ACCORDIONHEADER,
  TESTID_ACCORDIONHEADER_TITLE,
  TESTID_ACCORDIONHEADER_ARROWICON,
  TESTID_ACCORDIONHEADER_ARROWICON_ANIMATION,
  DEFAULT_ACCORDIONHEADER_HORIZONTALALIGNMENT,
} from './AccordionHeader.constants';

const AccordionHeader = ({
  style,
  title,
  isExpanded = false,
  onPress,
  horizontalAlignment = DEFAULT_ACCORDIONHEADER_HORIZONTALALIGNMENT,
}: AccordionHeaderProps) => {
  const { styles } = useStyles(styleSheet, { style, horizontalAlignment });
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
      testID={TESTID_ACCORDIONHEADER}
    >
      <Text
        variant={TextVariant.BodyMD}
        style={styles.title}
        testID={TESTID_ACCORDIONHEADER_TITLE}
      >
        {title}
      </Text>
      <Animated.View
        style={[styles.arrowContainer, animatedStyles]}
        testID={TESTID_ACCORDIONHEADER_ARROWICON_ANIMATION}
      >
        <Icon
          name={IconName.ArrowUp}
          size={IconSize.Sm}
          color={styles.title.color}
          testID={TESTID_ACCORDIONHEADER_ARROWICON}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default AccordionHeader;
