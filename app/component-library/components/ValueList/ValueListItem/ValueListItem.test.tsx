// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';

// Internal dependencies.
import ValueListItem from './ValueListItem';
import {
  DEFAULT_VALUELISTITEM_LABEL_TEXTVARIANT,
  DEFAULT_VALUELISTITEM_DESCRIPTION_TEXTVARIANT,
  SAMPLE_VALUELISTITEM_PROPS,
} from './ValueListItem.constants';

describe('ValueListItem', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(<ValueListItem {...SAMPLE_VALUELISTITEM_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render ValueListItem with the right text variant for the label if typeof label === string', () => {
    const { getByRole } = render(
      <ValueListItem label={SAMPLE_VALUELISTITEM_PROPS.label} />,
    );
    expect(getByRole('text').props.style.fontFamily).toBe(
      mockTheme.typography[DEFAULT_VALUELISTITEM_LABEL_TEXTVARIANT].fontFamily,
    );
  });
  it('should render ValueListItem with the right text variant for the description if typeof description === string', () => {
    const { getByRole } = render(
      <ValueListItem description={SAMPLE_VALUELISTITEM_PROPS.description} />,
    );
    expect(getByRole('text').props.style.fontFamily).toBe(
      mockTheme.typography[DEFAULT_VALUELISTITEM_DESCRIPTION_TEXTVARIANT]
        .fontFamily,
    );
  });
});
