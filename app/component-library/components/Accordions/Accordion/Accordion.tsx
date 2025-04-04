/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import Animated from 'react-native-reanimated';

// External dependencies.
import { useStyles } from '../../../hooks';
import AccordionHeader from './foundation/AccordionHeader';

// Internal dependencies.
import styleSheet from './Accordion.styles';
import { AccordionProps } from './Accordion.types';
import {
  TESTID_ACCORDION,
  TESTID_ACCORDION_CONTENT,
  // DEFAULT_ACCORDION_EXPANDDURATION,
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
  // const ref = useRef<TransitioningView>(null);
  // const transition = (
  //   <Transition.Together>
  //     <Transition.In
  //       type="fade"
  //       durationMs={DEFAULT_ACCORDION_EXPANDDURATION}
  //     />
  //     <Transition.Out
  //       type="fade"
  //       durationMs={DEFAULT_ACCORDION_EXPANDDURATION}
  //     />
  //   </Transition.Together>
  // );
  const onHeaderPressed = () => {
    // if (ref.current) {
    //   ref.current.animateNextTransition();
    // }
    setExpanded(!expanded);
    onPress?.();
  };

  return (
    <>
      <AccordionHeader
        title={title}
        isExpanded={expanded}
        onPress={onHeaderPressed}
        style={styles.base}
        testID={TESTID_ACCORDION}
        {...props}
      />
      {expanded && (
        <Animated.View
          // TODO - Reintroduce layout animations to accordion
          testID={TESTID_ACCORDION_CONTENT}
        >
          {children}
        </Animated.View>
      )}
    </>
  );
};

export default Accordion;
