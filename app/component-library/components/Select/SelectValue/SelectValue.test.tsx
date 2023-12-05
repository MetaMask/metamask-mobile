// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';

// Internal dependencies.
import SelectValue from './SelectValue';
import {
  DEFAULT_SELECTVALUE_LABEL_TEXTVARIANT,
  DEFAULT_SELECTVALUE_DESCRIPTION_TEXTVARIANT,
  SAMPLE_SELECTVALUE_PROPS,
} from './SelectValue.constants';

describe('SelectValue', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(<SelectValue {...SAMPLE_SELECTVALUE_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render SelectValue with the right text variant for the label if typeof label === string', () => {
    const { getByRole } = render(
      <SelectValue label={SAMPLE_SELECTVALUE_PROPS.label} />,
    );
    expect(getByRole('text').props.style.fontFamily).toBe(
      mockTheme.typography[DEFAULT_SELECTVALUE_LABEL_TEXTVARIANT].fontFamily,
    );
  });
  it('should render SelectValue with the right text variant for the description if typeof description === string', () => {
    const { getByRole } = render(
      <SelectValue description={SAMPLE_SELECTVALUE_PROPS.description} />,
    );
    expect(getByRole('text').props.style.fontFamily).toBe(
      mockTheme.typography[DEFAULT_SELECTVALUE_DESCRIPTION_TEXTVARIANT]
        .fontFamily,
    );
  });
});
