import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import NotificationContent from './Content';

describe('NotificationContent', () => {
  const title = 'Welcome to the new Test!';
  const yesterday = new Date().setDate(new Date().getDate() - 1);
  const createdAt = new Date(yesterday).toISOString(); // Relative date: one day before current date
  const description = {
    start:
      'We are excited to announce the launch of our brand new website and app!',
    end: 'Ethereum',
  };

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <NotificationContent
        title={title}
        description={description}
        createdAt={createdAt}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders title and 1 part of description', () => {
    const titleWithTo = 'Sent 0.01 ETH to 0x10000';
    const { getByText } = renderWithProvider(
      <NotificationContent
        title={titleWithTo}
        description={{
          start: 'testing without the rhs/end section of notification',
        }}
        createdAt={createdAt}
      />,
    );

    expect(getByText(titleWithTo)).toBeTruthy();
  });
});
