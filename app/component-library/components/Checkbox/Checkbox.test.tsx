// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import Text, { TextVariant } from '../Texts/Text';
import { mockTheme } from '../../../util/theme';
import { getFontStyleVariant, FontWeight } from '../Texts/Text/Text.utils';

// Internal dependencies.
import Checkbox from './Checkbox';
import {
  CHECKBOX_ICON_TESTID,
  DEFAULT_CHECKBOX_ISINDETERMINATE_ICONNAME,
  DEFAULT_CHECKBOX_ISCHECKED_ICONNAME,
  DEFAULT_CHECKBOX_LABEL_TEXTVARIANT,
} from './Checkbox.constants';

describe('Checkbox', () => {
  it('should render correctly', () => {
    const wrapper = render(<Checkbox />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render the correct icon when isChecked is true', () => {
    const { getByTestId } = render(<Checkbox isChecked />);
    expect(getByTestId(CHECKBOX_ICON_TESTID).props.name).toBe(
      DEFAULT_CHECKBOX_ISCHECKED_ICONNAME,
    );
  });

  it('should render the correct icon when isIndeterminate is true', () => {
    const { getByTestId } = render(<Checkbox isIndeterminate />);
    expect(getByTestId(CHECKBOX_ICON_TESTID).props.name).toBe(
      DEFAULT_CHECKBOX_ISINDETERMINATE_ICONNAME,
    );
  });

  it('should not render any icon when isChecked and isIndeterminate are false', () => {
    const { queryByTestId } = render(<Checkbox />);
    expect(queryByTestId(CHECKBOX_ICON_TESTID)).toBe(null);
  });

  it('should not render a label if none is given', () => {
    const { queryByRole } = render(<Checkbox />);
    expect(queryByRole('text')).toBe(null);
  });

  it('should render Checkbox with the right text variant if typeof label === string', () => {
    const { getByRole } = render(<Checkbox label={'Sample Checkbox Label'} />);
    const fontFamily = getFontStyleVariant(
      mockTheme.typography[DEFAULT_CHECKBOX_LABEL_TEXTVARIANT]
        .fontWeight as FontWeight,
      'normal',
    );
    expect(getByRole('text').props.style.fontFamily).toBe(fontFamily);
  });

  it('should render Checkbox with the custom node if typeof label !== string', () => {
    const testTextVariant = TextVariant.DisplayMD;
    const { getByRole } = render(
      <Checkbox
        label={<Text variant={testTextVariant}>Sample Checkbox Label</Text>}
      />,
    );
    const fontFamily = getFontStyleVariant(
      mockTheme.typography[testTextVariant].fontWeight as FontWeight,
      'normal',
    );
    expect(getByRole('text').props.style.fontFamily).toBe(fontFamily);
  });
});
