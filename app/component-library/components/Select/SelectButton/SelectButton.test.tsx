// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import SelectButton from './SelectButton';
import { SAMPLE_SELECTBUTTON_PROPS } from './SelectButton.constants';

describe('SelectButton', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(<SelectButton {...SAMPLE_SELECTBUTTON_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
});
