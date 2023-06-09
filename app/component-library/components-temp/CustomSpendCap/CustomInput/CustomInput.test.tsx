import { shallow } from 'enzyme';
// Third party dependencies.
import React from 'react';

// External dependencies.
import { TICKER } from '../CustomSpendCap.constants';
// Internal dependencies.
import CustomInput from './CustomInput';
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
    };
  });

  const renderComponent = () => shallow(<CustomInput {...props} />);

  it('should render correctly', () => {
    const component = renderComponent();
    expect(component).toMatchSnapshot();
  });
});
