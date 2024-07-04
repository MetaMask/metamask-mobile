import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CustomInput from './CustomInput';
import {
  CUSTOM_SPEND_CAP_INPUT_INPUT_ID,
  CUSTOM_SPEND_CAP_MAX_TEST_ID,
} from './CustomInput.constants';
import { CustomInputProps } from './CustomInput.types';
import { TICKER } from '../CustomSpendCap.constants';

describe('CustomInput', () => {
  let props: CustomInputProps;

  beforeEach(() => {
    props = {
      ticker: TICKER,
      value: '123',
      isInputGreaterThanBalance: false,
      isEditDisabled: false,
      setMaxSelected: jest.fn(),
      setValue: jest.fn(),
      tokenDecimal: 4,
    };
  });

  const renderComponent = () => render(<CustomInput {...props} />);

  it('should render correctly', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call setMaxSelected when max button is pressed', () => {
    const { getByTestId } = renderComponent();
    fireEvent.press(getByTestId(CUSTOM_SPEND_CAP_MAX_TEST_ID));
    expect(props.setMaxSelected).toHaveBeenCalled();
  });

  it('should update value if input is integer', () => {
    const { getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId(CUSTOM_SPEND_CAP_INPUT_INPUT_ID), '123');
    expect(props.setValue).toHaveBeenCalledWith('123');
  });

  it('should update value if input is decimal and decimal points are less than or equal to tokenDecimal', () => {
    const { getByTestId } = renderComponent();
    fireEvent.changeText(
      getByTestId(CUSTOM_SPEND_CAP_INPUT_INPUT_ID),
      '123.1234',
    );
    expect(props.setValue).toHaveBeenCalledWith('123.1234');
  });

  it('should not update value if input is decimal and decimal points are greater than tokenDecimal', () => {
    const { getByTestId } = renderComponent();
    fireEvent.changeText(
      getByTestId(CUSTOM_SPEND_CAP_INPUT_INPUT_ID),
      '123.1234567',
    );
    expect(props.setValue).not.toHaveBeenCalled();
  });
});
