import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import TabBarFloatingTradeButton from './TabBarFloatingTradeButton';

const mockRootNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockRootNavigate }),
}));

let mockIsNativeTabBarEnabled = true;
jest.mock('../../../../selectors/featureFlagController/nativeTabBar', () => ({
  selectNativeTabBarEnabled: () => mockIsNativeTabBarEnabled,
}));

const mockWithTiming = jest.fn<unknown, [value: unknown, config?: unknown]>(
  (value) => value,
);
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  withTiming: (value: unknown, config?: unknown) =>
    mockWithTiming(value, config),
}));

const TEST_ID = 'trade-button';
const ACTIVE_SCALE = 1.04;
const mockInitialState = { engine: { backgroundState } };

const renderButton = () =>
  renderWithProvider(<TabBarFloatingTradeButton testID={TEST_ID} />, {
    state: mockInitialState,
  });

const backgroundOf = (view: ReturnType<typeof renderButton>) =>
  StyleSheet.flatten(view.getByTestId(TEST_ID).props.style).backgroundColor;

const open = (view: ReturnType<typeof renderButton>) =>
  fireEvent.press(view.getByTestId(TEST_ID));

describe('TabBarFloatingTradeButton', () => {
  afterEach(() => {
    mockRootNavigate.mockClear();
    mockWithTiming.mockClear();
    mockIsNativeTabBarEnabled = true;
  });

  it('stays transparent before the tray opens, so the surface shows through', () => {
    const view = renderButton();

    expect(backgroundOf(view)).toBe('transparent');
  });

  it('keeps the surface showing through while the tray is open', () => {
    const view = renderButton();

    open(view);

    expect(backgroundOf(view)).toBe('transparent');
    expect(view.getByTestId(TEST_ID).props.accessibilityState).toEqual({
      expanded: true,
    });
  });

  it('lifts the button while the tray is open', () => {
    const view = renderButton();

    open(view);

    expect(mockWithTiming).toHaveBeenCalledWith(
      ACTIVE_SCALE,
      expect.objectContaining({ duration: 120 }),
    );
  });

  it('keeps the button flat when the native bar is switched off', () => {
    mockIsNativeTabBarEnabled = false;
    const view = renderButton();

    open(view);

    expect(mockWithTiming).not.toHaveBeenCalledWith(
      ACTIVE_SCALE,
      expect.anything(),
    );
    expect(mockWithTiming).toHaveBeenCalledWith('45deg', expect.anything());
  });
});
