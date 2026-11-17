/**
 * Integration coverage for the case the unit tests mock away: a real
 * navigator, whose screens never emit `transitionEnd` in Jest. The gate must
 * still release, through the fallback, so a screen can never stay stuck on its
 * placeholder.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { SCREEN_TRANSITION_FALLBACK_MS } from '../hooks/subscribeScreenTransition';
import { DeferredRender } from './DeferredRender';

jest.mock('../../util/trace', () => ({
  TraceName: {
    DeferredRenderRelease: 'Deferred Render Release',
    ScreenTransition: 'Screen Transition',
  },
  TraceOperation: {
    DeferredRender: 'deferred_render',
    ScreenTransition: 'screen.transition',
  },
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const Stack = createNativeStackNavigator();

function GatedScreen() {
  return (
    <DeferredRender placeholder={<View testID="placeholder" />}>
      <View testID="content" />
    </DeferredRender>
  );
}

function PaintedScreen() {
  return (
    <DeferredRender mode="paint" placeholder={<View testID="placeholder" />}>
      <View testID="content" />
    </DeferredRender>
  );
}

function renderScreen(Component: () => React.JSX.Element) {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Gated" component={Component} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('DeferredRender inside a real navigator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('releases through the fallback when no transitionEnd is emitted', () => {
    const view = renderScreen(GatedScreen);

    expect(view.getByTestId('placeholder')).toBeOnTheScreen();

    // The navigator emits `focus`, which re-arms the fallback, so the effective
    // deadline is one fallback after focus rather than after mount.
    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS * 3);
    });

    expect(view.getByTestId('content')).toBeOnTheScreen();
    expect(view.queryByTestId('placeholder')).toBeNull();
  });

  it('releases on the first frame in paint mode without waiting for the fallback', () => {
    const view = renderScreen(PaintedScreen);

    expect(view.getByTestId('placeholder')).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(16);
    });

    expect(view.getByTestId('content')).toBeOnTheScreen();
  });
});
