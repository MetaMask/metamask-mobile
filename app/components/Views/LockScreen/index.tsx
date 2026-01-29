/* eslint-disable import/no-commonjs */
import React, { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import FoxLoader from '../../UI/FoxLoader';

/**
 * View that displays a loading animation when the app is locked.
 */
const LockScreen: React.FC = () => {
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true; // Returning true prevents default back behavior
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, []),
  );

  return <FoxLoader />;
};

export default LockScreen;
