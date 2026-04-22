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

  it('should render correctly', () => {
    const component = renderComponent();
    expect(component).toMatchSnapshot();
  });

  it('should call setMaxSelected when max button is pressed', () => {
    const component = renderComponent();
    component
      .findWhere((node) => node.prop('testID') === CUSTOM_SPEND_CAP_MAX_TEST_ID)
      .simulate('press');
    expect(props.setMaxSelected).toHaveBeenCalled();
  });

  it('should update value if input is integer', () => {
    const component = renderComponent();
    component
      .findWhere(
        (node) => node.prop('testID') === CUSTOM_SPEND_CAP_INPUT_INPUT_ID,
      )
      .simulate('changeText', '123');
    expect(props.setValue).toHaveBeenCalledWith('123');
  });

  it('should update value if input is decimal and decimal points are less than or equal to tokenDecimal', () => {
    const component = renderComponent();
    component
      .findWhere(
        (node) => node.prop('testID') === CUSTOM_SPEND_CAP_INPUT_INPUT_ID,
      )
      .simulate('changeText', '123.1234');
    expect(props.setValue).toHaveBeenCalledWith('123.1234');
  });

  it('should not update value if input is decimal and decimal points are greater than tokenDecimal', () => {
    const component = renderComponent();
    component
      .findWhere(
        (node) => node.prop('testID') === CUSTOM_SPEND_CAP_INPUT_INPUT_ID,
      )
      .simulate('changeText', '123.1234567');
    expect(props.setValue).not.toHaveBeenCalled();
  });
});
