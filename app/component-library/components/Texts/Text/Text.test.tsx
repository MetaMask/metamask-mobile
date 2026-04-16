// Third party dependencies
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies
import { mockTheme } from '../../../../util/theme';

// Internal dependencies
import Text from './Text';
import { SAMPLE_TEXT_PROPS, DEFAULT_TEXT_VARIANT } from './Text.constants';
import { getFontFamily } from './Text.utils';

describe('Text', () => {
  it('should render correctly', () => {
    const wrapper = render(<Text {...SAMPLE_TEXT_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render the correct fontFamily', () => {
    const { getByRole } = render(<Text {...SAMPLE_TEXT_PROPS} />);
    const fontFamily = getFontFamily(DEFAULT_TEXT_VARIANT);

    expect(getByRole('text').props.style.fontFamily).toBe(fontFamily);
  });

  it('should render the correct text color', () => {
    const { getByRole } = render(<Text {...SAMPLE_TEXT_PROPS} />);

    expect(getByRole('text').props.style.color).toBe(
      mockTheme.colors.text.default,
    );
  });
});
