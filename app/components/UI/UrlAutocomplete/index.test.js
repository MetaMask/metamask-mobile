import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import UrlAutocomplete from './';

describe('UrlAutocomplete', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<UrlAutocomplete />, {});
    expect(toJSON()).toMatchSnapshot();
  });
});
