// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import { getFontFamily, FontWeight } from '../../Texts/Text/Text.utils';

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

    const fontFamily = getFontFamily(
      mockTheme.typography[DEFAULT_SELECTVALUE_LABEL_TEXTVARIANT]
        .fontWeight as FontWeight,
      'normal',
    );

    expect(getByRole('text').props.style.fontFamily).toBe(fontFamily);
  });
  it('should render SelectValue with the right text variant for the description if typeof description === string', () => {
    const { getByRole } = render(
      <SelectValue description={SAMPLE_SELECTVALUE_PROPS.description} />,
    );

    const fontFamily = getFontFamily(
      mockTheme.typography[DEFAULT_SELECTVALUE_DESCRIPTION_TEXTVARIANT]
        .fontWeight as FontWeight,
      'normal',
    );

    expect(getByRole('text').props.style.fontFamily).toBe(fontFamily);
  });
});
