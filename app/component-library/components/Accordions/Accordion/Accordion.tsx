/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState, useRef } from 'react';
import { View } from 'react-native';
import {
  Transitioning,
  TransitioningView,
  Transition,
} from 'react-native-reanimated';

// External dependencies.
import { useStyles } from '../../../hooks';
import AccordionHeader from './foundation/AccordionHeader';

// Internal dependencies.
import styleSheet from './Accordion.styles';
import { AccordionProps } from './Accordion.types';
import {
  ACCORDION_TEST_ID,
  ACCORDION_CONTENT_TEST_ID,
  ACCORDION_EXPAND_TRANSITION_DURATION,
} from './Accordion.constants';

const Accordion: React.FC<AccordionProps> = ({
  style,
  children,
  isExpanded = false,
  title,
  onPress,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const [expanded, setExpanded] = useState(isExpanded);
  const ref = useRef<TransitioningView>(null);
  const transition = (
    <Transition.Together>
      <Transition.In
        type="fade"
        durationMs={ACCORDION_EXPAND_TRANSITION_DURATION}
      />
      <Transition.Out
        type="fade"
        durationMs={ACCORDION_EXPAND_TRANSITION_DURATION}
      />
    </Transition.Together>
  );
  const onHeaderPressed = () => {
    if (ref.current) {
      ref.current.animateNextTransition();
    }
    setExpanded(!expanded);
    onPress?.();
  };

  return (
    <View style={styles.base} testID={ACCORDION_TEST_ID} {...props}>
      <AccordionHeader
        title={title}
        isExpanded={expanded}
        onPress={onHeaderPressed}
      />
      <Transitioning.View {...{ ref, transition }}>
        {expanded && <View testID={ACCORDION_CONTENT_TEST_ID}>{children}</View>}
      </Transitioning.View>
    </View>
  );
};

export default Accordion;
