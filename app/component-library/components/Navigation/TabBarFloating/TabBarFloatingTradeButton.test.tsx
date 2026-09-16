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

const TEST_ID = 'trade-button';
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
  });

  it('stays transparent before the tray opens, so the surface shows through', () => {
    const view = renderButton();

    expect(backgroundOf(view)).toBe('transparent');
  });

  it('paints a solid fill while the tray is open', () => {
    const view = renderButton();

    open(view);

    expect(backgroundOf(view)).not.toBe('transparent');
  });
});
