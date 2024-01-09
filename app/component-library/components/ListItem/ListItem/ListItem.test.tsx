// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';

// Internal dependencies.
import ListItem from './ListItem';
import {
  DEFAULT_LISTITEM_LABEL_TEXTVARIANT,
  DEFAULT_LISTITEM_DESCRIPTION_TEXTVARIANT,
  SAMPLE_LISTITEM_PROPS,
} from './ListItem.constants';

describe('ListItem', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(<ListItem {...SAMPLE_LISTITEM_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render ListItem with the right text variant for the label if typeof label === string', () => {
    const { getByRole } = render(
      <ListItem label={SAMPLE_LISTITEM_PROPS.label} />,
    );
    expect(getByRole('text').props.style.fontFamily).toBe(
      mockTheme.typography[DEFAULT_LISTITEM_LABEL_TEXTVARIANT].fontFamily,
    );
  });
  it('should render ListItem with the right text variant for the description if typeof description === string', () => {
    const { getByRole } = render(
      <ListItem description={SAMPLE_LISTITEM_PROPS.description} />,
    );
    expect(getByRole('text').props.style.fontFamily).toBe(
      mockTheme.typography[DEFAULT_LISTITEM_DESCRIPTION_TEXTVARIANT].fontFamily,
    );
  });
});
