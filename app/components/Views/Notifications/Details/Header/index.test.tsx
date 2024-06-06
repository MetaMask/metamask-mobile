import React from 'react';

import Header from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

jest.mock('@react-navigation/native');

describe('Header', () => {
  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <Header
        title={'Notification Announcement'}
        subtitle={'This is a mock of description'}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
