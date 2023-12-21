// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import SelectOption from './SelectOption';
import { SAMPLE_SELECTOPTION_PROPS } from './SelectOption.constants';

describe('SelectOption', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(<SelectOption {...SAMPLE_SELECTOPTION_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should not render the selected view if isSelected is false', () => {
    const { queryByRole } = render(
      <SelectOption {...SAMPLE_SELECTOPTION_PROPS} />,
    );
    expect(queryByRole('checkbox')).toBeNull();
  });

  it('should render the selected view if isSelected is true', () => {
    const { queryByRole } = render(
      <SelectOption {...SAMPLE_SELECTOPTION_PROPS} isSelected />,
    );
    expect(queryByRole('checkbox')).not.toBeNull();
  });
});
