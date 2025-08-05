import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { EditAmountKeyboard } from './edit-amount-keyboard';
import { noop } from 'lodash';

describe('EditAmountKeyboard', () => {
  it('calls onChange when digit pressed', () => {
    const onChangeMock = jest.fn();

    const { getByText } = render(
      <EditAmountKeyboard
        onChange={onChangeMock}
        onDonePress={noop}
        onPercentagePress={noop}
        value={0}
      />,
    );

    const digitButton = getByText('1');
    fireEvent.press(digitButton);

    expect(onChangeMock).toHaveBeenCalledWith(1);
  });

  it('calls onDone when done button pressed', () => {
    const onDonePressMock = jest.fn();

    const { getByText } = render(
      <EditAmountKeyboard
        onChange={noop}
        onDonePress={onDonePressMock}
        onPercentagePress={noop}
        value={0}
      />,
    );

    const doneButton = getByText('Done');
    fireEvent.press(doneButton);

    expect(onDonePressMock).toHaveBeenCalled();
  });

  it('calls onPercentagePress when percentage button pressed', () => {
    const onPercentagePressMock = jest.fn();

    const { getByText } = render(
      <EditAmountKeyboard
        onChange={noop}
        onDonePress={noop}
        onPercentagePress={onPercentagePressMock}
        value={0}
      />,
    );

    const percentageButton = getByText('50%');
    fireEvent.press(percentageButton);

    expect(onPercentagePressMock).toHaveBeenCalled();
  });
});
