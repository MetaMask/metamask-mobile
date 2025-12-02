import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import NotificationContent from './Content';

describe('NotificationContent', () => {
  const title = 'Welcome to the new Test!';
  const yesterday = new Date().setDate(new Date().getDate() - 1);
  const createdAt = new Date(yesterday).toISOString(); // Relative date: one day before current date
  const description = {
    start: 'Some starting text',
    end: 'Ethereum',
  };

  it('renders title and description', () => {
    const { getByText } = renderWithProvider(
      <NotificationContent
        title={title}
        description={{
          start: description.start,
          end: description.end,
        }}
        createdAt={createdAt}
      />,
    );

    expect(getByText(title)).toBeOnTheScreen();
    expect(getByText(description.start)).toBeOnTheScreen();
    expect(getByText(description.end)).toBeOnTheScreen();
  });
});
