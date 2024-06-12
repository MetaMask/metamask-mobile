/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';
import SliderButton from '../../../../components/UI/SliderButton';
import Text from '../../Texts/Text';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './Card.styles';
import { CardProps } from './Card.types';

const Card: React.FC<CardProps> = ({ style, children, ...props }) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <SliderButton
      incompleteText={<Text>Swipe to swap</Text>}
      completeText={<Text>Swap completed</Text>}
    />
  );
};

export default Card;
