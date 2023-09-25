// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import Text, { TextVariant } from '../Texts/Text';
import { mockTheme } from '../../../util/theme';

// Internal dependencies.
import HeaderBase from './HeaderBase';
import {
  DEFAULT_HEADERBASE_TITLE_TEXTVARIANT,
  HEADERBASE_TEST_ID,
  HEADERBASE_TITLE_TEST_ID,
} from './HeaderBase.constants';

describe('HeaderBase', () => {
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
    expect(getByRole('text').props.style.fontFamily).toBe(
      mockTheme.typography[DEFAULT_HEADERBASE_TITLE_TEXTVARIANT].fontFamily,
    );
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
    expect(getByRole('text').props.style.fontFamily).toBe(
      mockTheme.typography[testTextVariant].fontFamily,
    );
  });
});
