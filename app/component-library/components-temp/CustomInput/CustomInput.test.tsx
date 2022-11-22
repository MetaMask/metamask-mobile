import React from 'react';
import { shallow } from 'enzyme';
import CustomInput from './CustomInput';
import { CustomInputProps } from './CustomInput.types';
import { TICKER, MAX_VALUE, DEFAULT_VALUE } from './CustomInput.constants';

describe('CustomInput', () => {
  let props: CustomInputProps;

  beforeEach(() => {
    props = {
      ticker: TICKER,
      getUpdatedValue: jest.fn(),
      maxAvailableValue: MAX_VALUE,
      defaultValue: DEFAULT_VALUE,
    };
  });

  const renderComponent = () => shallow(<CustomInput {...props} />);

  it('should render correctly', () => {
    const component = renderComponent();
    expect(component).toMatchSnapshot();
  });

  it('should render correctly when defaultValue is not provided', () => {
    props.defaultValue = undefined;
    const component = renderComponent();
    expect(component).toMatchSnapshot();
  });
});
