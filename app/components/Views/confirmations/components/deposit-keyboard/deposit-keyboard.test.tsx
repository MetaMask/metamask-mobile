import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DepositKeyboard } from './deposit-keyboard';
import { noop } from 'lodash';

describe('DepositKeyboard', () => {
  it('calls onChange when digit pressed', () => {
    const onChangeMock = jest.fn();

    const { getByText } = render(
      <DepositKeyboard
        onChange={onChangeMock}
        onDonePress={noop}
        onPercentagePress={noop}
        value="0"
        hasInput={false}
      />,
    );

    fireEvent.press(getByText('1'));

    expect(onChangeMock).toHaveBeenCalledWith('1');
  });

  it('hides done button if hasInput is false', () => {
    const { queryByTestId } = render(
      <DepositKeyboard
        onChange={noop}
        onDonePress={noop}
        onPercentagePress={noop}
        value="0"
        hasInput={false}
      />,
    );

    expect(queryByTestId('deposit-keyboard-done-button')).toBeNull();
  });

  it('shows done button if hasInput', () => {
    const { getByTestId, getByText } = render(
      <DepositKeyboard
        onChange={noop}
        onDonePress={noop}
        onPercentagePress={noop}
        value="0"
        hasInput
      />,
    );

    fireEvent.press(getByText('1'));

    expect(getByTestId('deposit-keyboard-done-button')).toBeDefined();
  });

  it('calls onDone when done button pressed', () => {
    const onDonePressMock = jest.fn();

    const { getByTestId } = render(
      <DepositKeyboard
        onChange={noop}
        onDonePress={onDonePressMock}
        onPercentagePress={noop}
        value="0"
        hasInput
      />,
    );

    fireEvent.press(getByTestId('deposit-keyboard-done-button'));

    expect(onDonePressMock).toHaveBeenCalled();
  });

  it('calls onPercentagePress when percentage button pressed', () => {
    const onPercentagePressMock = jest.fn();

    const { getByText } = render(
      <DepositKeyboard
        onChange={noop}
        onDonePress={noop}
        onPercentagePress={onPercentagePressMock}
        value="0"
        hasInput={false}
      />,
    );

    fireEvent.press(getByText('50%'));

    expect(onPercentagePressMock).toHaveBeenCalled();
  });
});
