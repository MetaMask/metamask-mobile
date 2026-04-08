import { shallow } from 'enzyme';
// Third party dependencies.
import React from 'react';

// External dependencies.
import { TICKER } from '../CustomSpendCap.constants';
// Internal dependencies.
import CustomInput from './CustomInput';
import {
  CUSTOM_SPEND_CAP_INPUT_INPUT_ID,
  CUSTOM_SPEND_CAP_MAX_TEST_ID,
} from './CustomInput.constants';
import { CustomInputProps } from './CustomInput.types';

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

  const renderComponent = () => shallow(<CustomInput {...props} />);

  it('renders with default props', () => {
    const component = renderComponent();

    expect(component.exists()).toBe(true);
  });

  it('calls setMaxSelected when max button is pressed', () => {
    const component = renderComponent();

    component
      .findWhere((node) => node.prop('testID') === CUSTOM_SPEND_CAP_MAX_TEST_ID)
      .simulate('press');

    expect(props.setMaxSelected).toHaveBeenCalled();
  });

  it('calls setValue with integer input', () => {
    const component = renderComponent();

    component
      .findWhere(
        (node) => node.prop('testID') === CUSTOM_SPEND_CAP_INPUT_INPUT_ID,
      )
      .simulate('changeText', '123');

    expect(props.setValue).toHaveBeenCalledWith('123');
  });

  it('calls setValue with decimal input within tokenDecimal precision', () => {
    const component = renderComponent();

    component
      .findWhere(
        (node) => node.prop('testID') === CUSTOM_SPEND_CAP_INPUT_INPUT_ID,
      )
      .simulate('changeText', '123.1234');

    expect(props.setValue).toHaveBeenCalledWith('123.1234');
  });

  it('does not call setValue when decimal places exceed tokenDecimal', () => {
    const component = renderComponent();

    component
      .findWhere(
        (node) => node.prop('testID') === CUSTOM_SPEND_CAP_INPUT_INPUT_ID,
      )
      .simulate('changeText', '123.1234567');

    expect(props.setValue).not.toHaveBeenCalled();
  });
});
