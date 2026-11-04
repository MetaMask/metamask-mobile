import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

import TabBarFloating, {
  type TabBarFloatingProps,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating';
import Routes from '../../../../constants/navigation/Routes';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import ContextualExploreTabBar from './ContextualExploreTabBar';
import ContextualMoneyTabBar from './ContextualMoneyTabBar';
import {
  getHomeFooterMode,
  shouldFadeHomeFooter,
} from './contextualHomeFooterMode';
import {
  enterExploreSection,
  enterMoneySection,
  exitContextualSection,
  isPlusMenuSection,
  useContextualNavState,
} from './contextualSection';

export type ContextualHomeFooterProps = TabBarFloatingProps;

/**
 * Home floating footer. Money and Explore replace the pill in this same slot.
 * + menu sections keep their own pushed screens and are left alone here.
 */
const ContextualHomeFooter = ({
  state,
  descriptors,
  navigation,
  onHeightChange,
  trailingAction,
}: ContextualHomeFooterProps) => {
  const { section } = useContextualNavState();
  const hardware = getHardwareTier();
  const network = useNetworkTier();
  const mode = getHomeFooterMode(state.routes[state.index]?.name);
  const fadeIn = shouldFadeHomeFooter(hardware, network);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;

  useLayoutEffect(() => {
    if (mode === 'money') {
      if (section !== 'money' && !isPlusMenuSection(section)) {
        enterMoneySection();
      }
      return;
    }
    if (mode === 'explore') {
      if (section !== 'explore' && !isPlusMenuSection(section)) {
        enterExploreSection();
      }
      return;
    }
    if (section === 'money' || section === 'explore') {
      exitContextualSection();
    }
  }, [mode, section]);

  useEffect(
    () => () => {
      onHeightChangeRef.current?.(0);
    },
    [],
  );

  const handleHeightChange = useCallback((height: number) => {
    if (height === 0 && modeRef.current !== 'home') {
      return;
    }
    onHeightChangeRef.current?.(height);
  }, []);

  const handleHomePress = useCallback(() => {
    exitContextualSection();
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET_VIEW,
    });
  }, [navigation]);

  useEffect(() => {
    if (mode === 'home') {
      return undefined;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleHomePress();
        return true;
      },
    );
    return () => subscription.remove();
  }, [handleHomePress, mode]);

  if (mode === 'money') {
    return (
      <ContextualMoneyTabBar
        onHomePress={handleHomePress}
        fadeIn={fadeIn}
        onHeightChange={handleHeightChange}
      />
    );
  }

  if (mode === 'explore') {
    return (
      <ContextualExploreTabBar
        onHomePress={handleHomePress}
        fadeIn={fadeIn}
        onHeightChange={handleHeightChange}
      />
    );
  }

  return (
    <TabBarFloating
      state={state}
      descriptors={descriptors}
      navigation={navigation}
      onHeightChange={handleHeightChange}
      trailingAction={trailingAction}
    />
  );
};

export default ContextualHomeFooter;
