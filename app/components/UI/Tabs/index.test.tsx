import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Tabs from './';

describe('Tabs', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Tabs tabs={[{ id: 1, url: 'about:blank', image: '' }]} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
