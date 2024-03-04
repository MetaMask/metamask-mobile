import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import UrlAutocomplete from './';

describe('UrlAutocomplete', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(<UrlAutocomplete />, {});
    expect(wrapper).toMatchSnapshot();
  });
});
