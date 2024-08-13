// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import Text, { TextVariant } from '../Texts/Text';
import { mockTheme } from '../../../util/theme';
import { getFontFamily, FontWeight } from '../Texts/Text/Text.utils';

// Internal dependencies.
import RadioButton from './RadioButton';
import {
  RADIOBUTTON_ICON_TESTID,
  DEFAULT_RADIOBUTTON_LABEL_TEXTVARIANT,
} from './RadioButton.constants';

describe('RadioButton', () => {
  it('should render correctly', () => {
    const wrapper = render(<RadioButton />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render the correct icon when isChecked is true', () => {
    const { getByTestId } = render(<RadioButton isChecked />);
    expect(getByTestId(RADIOBUTTON_ICON_TESTID)).not.toBeNull();
  });

  it('should not render any icon when isChecked is false', () => {
    const { queryByTestId } = render(<RadioButton />);
    expect(queryByTestId(RADIOBUTTON_ICON_TESTID)).toBeNull();
  });

  it('should not render a label if none is given', () => {
    const { queryByRole } = render(<RadioButton />);
    expect(queryByRole('text')).toBe(null);
  });

  it('should render RadioButton with the right text variant if typeof label === string', () => {
    const { getByRole } = render(
      <RadioButton label={'Sample RadioButton Label'} />,
    );
    const fontFamily = getFontFamily(
      mockTheme.typography[DEFAULT_RADIOBUTTON_LABEL_TEXTVARIANT]
        .fontWeight as FontWeight,
      'normal',
    );

    expect(getByRole('text').props.style.fontFamily).toBe(fontFamily);
  });

  it('should render RadioButton with the custom node if typeof label !== string', () => {
    const testTextVariant = TextVariant.DisplayMD;
    const { getByRole } = render(
      <RadioButton
        label={<Text variant={testTextVariant}>Sample RadioButton Label</Text>}
      />,
    );

    const fontFamily = getFontFamily(
      mockTheme.typography[testTextVariant].fontWeight as FontWeight,
      'normal',
    );
    expect(getByRole('text').props.style.fontFamily).toBe(fontFamily);
  });
});
