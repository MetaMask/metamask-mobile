import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Routes from '../../../../constants/navigation/Routes';
import { PredictRoot } from '../../../UI/PredictNext';
import ContextualPredictTabBar from './ContextualPredictTabBar';
import {
  exitContextualSection,
  getContextualNavState,
} from './contextualSection';

/**
 * Predictions root. Entered from the + menu, the footer is part of this
 * screen, so the native push carries the home footer out and this footer in.
 * Home pops this screen, so the same card animation runs in reverse.
 */
const ContextualPredictRoot = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const [isSection] = useState(
    () => getContextualNavState().section === 'predict',
  );
  const handleHomePress = useCallback(() => {
    navigation.dispatch(
      StackActions.popTo(Routes.HOME_TABS, {
        screen: Routes.WALLET.HOME,
        params: { screen: Routes.WALLET_VIEW },
      }),
    );
  }, [navigation]);

  useEffect(() => {
    if (!isSection) {
      return undefined;
    }
    return () => {
      exitContextualSection();
    };
  }, [isSection]);

  if (!isSection) {
    return <PredictRoot />;
  }

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <View style={tw.style('flex-1')}>
        <PredictRoot />
      </View>
      <ContextualPredictTabBar onHomePress={handleHomePress} />
    </View>
  );
};

export default ContextualPredictRoot;
