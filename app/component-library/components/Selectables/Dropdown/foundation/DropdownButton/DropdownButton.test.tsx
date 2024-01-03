// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import DropdownButton from './DropdownButton';
import {
  SAMPLE_DROPDOWNBUTTON_PROPS,
  DROPDOWNBUTTON_TESTID,
} from './DropdownButton.constants';

describe('DropdownButton', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(<DropdownButton {...SAMPLE_DROPDOWNBUTTON_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render DropdownButton with the correct size', () => {
    const { queryByTestId } = render(
      <DropdownButton {...SAMPLE_DROPDOWNBUTTON_PROPS} />,
    );
    expect(queryByTestId(DROPDOWNBUTTON_TESTID).props.style.minHeight).toBe(40);
  });
});
