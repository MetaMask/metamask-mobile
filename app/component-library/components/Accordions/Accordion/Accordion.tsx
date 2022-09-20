/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import AccordionHeader from './AccordionHeader';

// Internal dependencies.
import styleSheet from './Accordion.styles';
import { AccordionProps } from './Accordion.types';

const Accordion: React.FC<AccordionProps> = ({
  style,
  accordionHeaderProps,
  children,
  isExpanded = false,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const [expanded, setExpanded] = useState(isExpanded);
  const onHeaderClicked = () => {
    setExpanded(!expanded);
    accordionHeaderProps.onPress?.();
  };

  return (
    <View style={styles.base} {...props}>
      <AccordionHeader
        {...accordionHeaderProps}
        isExpanded={expanded}
        onPress={onHeaderClicked}
      />
      {expanded && <View>{children}</View>}
    </View>
  );
};

export default Accordion;
