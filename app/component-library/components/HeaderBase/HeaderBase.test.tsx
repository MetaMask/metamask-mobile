// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// External dependencies.
import Text, { TextVariant } from '../Texts/Text';
import { mockTheme } from '../../../util/theme';
import { getFontStyleVariant, FontWeight } from '../Texts/Text/Text.utils';

// Internal dependencies.
import HeaderBase from './HeaderBase';
import {
  DEFAULT_HEADERBASE_TITLE_TEXTVARIANT,
  HEADERBASE_TEST_ID,
  HEADERBASE_TITLE_TEST_ID,
} from './HeaderBase.constants';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));
describe('HeaderBase', () => {
  const mockInsets = { top: 20, bottom: 0, left: 0, right: 0 };

  beforeEach(() => {
    (useSafeAreaInsets as jest.Mock).mockReturnValue(mockInsets);
  });

  it('should render snapshot correctly', () => {
    const wrapper = render(<HeaderBase>Sample HeaderBase Title</HeaderBase>);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render HeaderBase', () => {
    const { queryByTestId } = render(
      <HeaderBase>Sample HeaderBase Title</HeaderBase>,
    );
    expect(queryByTestId(HEADERBASE_TEST_ID)).not.toBe(null);
  });
  it('should render Header with the right text variant if typeof children === string', () => {
    const { getByRole } = render(
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
    const { getByRole } = render(
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

  it('applies marginTop when includesTopInset is true', () => {
    const { getByTestId } = render(
      <HeaderBase includesTopInset>Header Content</HeaderBase>,
    );

    const headerBase = getByTestId(HEADERBASE_TEST_ID);
    // Verify the marginTop is applied
    expect(headerBase.props.style).toEqual(
      expect.arrayContaining([{ marginTop: mockInsets.top }]),
    );
  });

  it('does not apply marginTop when includesTopInset is false', () => {
    const { getByTestId } = render(
      <HeaderBase includesTopInset={false}>Header Content</HeaderBase>,
    );

    const headerBase = getByTestId(HEADERBASE_TEST_ID);
    // Verify the marginTop is not applied
    expect(headerBase.props.style).toEqual(
      expect.not.arrayContaining([{ marginTop: mockInsets.top }]),
    );
  });
});
