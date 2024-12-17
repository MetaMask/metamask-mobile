// Third party dependencies.
import React from 'react';

// External dependencies.
import Text, { TextVariant } from '../Texts/Text';
import { mockTheme } from '../../../util/theme';
import { getFontStyleVariant, FontWeight } from '../Texts/Text/Text.utils';
import { renderWithSafeAreaProvider } from '../../../util/test/renderWithProvider';

// Internal dependencies.
import HeaderBase from './HeaderBase';
import {
  DEFAULT_HEADERBASE_TITLE_TEXTVARIANT,
  HEADERBASE_TEST_ID,
  HEADERBASE_TITLE_TEST_ID,
} from './HeaderBase.constants';

describe('HeaderBase', () => {
  it('should render snapshot correctly', () => {
    const wrapper = renderWithSafeAreaProvider(
      <HeaderBase>Sample HeaderBase Title</HeaderBase>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render HeaderBase', () => {
    const { queryByTestId } = renderWithSafeAreaProvider(
      <HeaderBase>Sample HeaderBase Title</HeaderBase>,
    );
    expect(queryByTestId(HEADERBASE_TEST_ID)).not.toBe(null);
  });
  it('should render Header with the right text variant if typeof children === string', () => {
    const { getByRole } = renderWithSafeAreaProvider(
      <HeaderBase>Sample HeaderBase Title</HeaderBase>,
    );
    const fontFamily = getFontStyleVariant(
      mockTheme.typography[DEFAULT_HEADERBASE_TITLE_TEXTVARIANT]
        .fontWeight as FontWeight,
      'normal',
    );

    expect(getByRole('text').props.style.fontFamily).toBe(fontFamily);
  });
  it('should render Header with the custom node if typeof children !== string', () => {
    const testTextVariant = TextVariant.DisplayMD;
    const { getByRole } = renderWithSafeAreaProvider(
      <HeaderBase>
        <Text variant={testTextVariant} testID={HEADERBASE_TITLE_TEST_ID}>
          Sample HeaderBase Title
        </Text>
      </HeaderBase>,
    );

    const fontFamily = getFontStyleVariant(
      mockTheme.typography[testTextVariant].fontWeight as FontWeight,
      'normal',
    );

    expect(getByRole('text').props.style.fontFamily).toBe(fontFamily);
  });
});
