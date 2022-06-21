/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../hooks';
import styleSheet from './StackedAvatars.styles';
import { StackedAvatarsProps } from './StackedAvatars.types';

const StackedAvatars = ({ size, type, tokenList }: StackedAvatarsProps) => {
  const { styles } = useStyles(styleSheet, {});

  // TODO: add a unique string for each avatar. Reason: re-renders should draw only the updated component and not the whole list
  return (
    <View>
      {tokenList?.map((Avatar, index) => (
        <View key={index} style={styles.avatarListContainer}>
          <Avatar size={size} />
        </View>
      ))}
    </View>
  );
};

export default StackedAvatars;

export { StackedAvatars };
