import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CustomNonceModal from '.';
import { ThemeContext , mockTheme } from '../../../../../../util/theme';

const PROPOSED_NONCE = 26;
const saveMock = jest.fn();
const closeMock = jest.fn();
const renderComponent = (props = {}) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      <CustomNonceModal
        save={saveMock}
        close={closeMock}
        proposedNonce={PROPOSED_NONCE}
        nonceValue={PROPOSED_NONCE}
        {...props}
      />
    </ThemeContext.Provider>,
  );
describe('CustomNonceModal', () => {
  it('renders correctly', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles only numeric inputs', () => {
    renderComponent();
    const nonceTextInput = screen.getByDisplayValue(String(PROPOSED_NONCE));
    fireEvent.changeText(nonceTextInput, '30c');
    expect(screen.getByDisplayValue(String(PROPOSED_NONCE))).toBeTruthy();
    fireEvent.changeText(nonceTextInput, '30');
    expect(screen.getByDisplayValue('30')).toBeTruthy();
  });

  it('increments nonce correctly', () => {
    renderComponent();
    const incrementButton = screen.getByTestId('increment-nonce');

    fireEvent.press(incrementButton);
    expect(screen.getByDisplayValue(String(PROPOSED_NONCE + 1))).toBeTruthy();
  });

  it('decrements nonce correctly', () => {
    renderComponent();
    const decrementButton = screen.getByTestId('decrement-nonce');

    fireEvent.press(decrementButton);
    expect(screen.getByDisplayValue(String(PROPOSED_NONCE - 1))).toBeTruthy();
  });

  it('does not decrement the nonce value below 0 when the current nonce is 0', () => {
    renderComponent({ proposedNonce: 0, nonceValue: 0 });
    const decrementButton = screen.getByTestId('decrement-nonce');

    fireEvent.press(decrementButton);
    expect(screen.getByDisplayValue(String(0))).toBeTruthy();
  });
});
