import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import NotificationContent, { TEST_IDS } from './Content';

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
        isRead
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

  it.each([
    { isRead: false, visible: true },
    { isRead: true, visible: false },
  ])(
    'renders unread indicator when isRead is $isRead',
    ({ isRead, visible }) => {
      const { queryByTestId } = renderWithProvider(
        <NotificationContent
          isRead={isRead}
          title={title}
          description={{
            start: description.start,
            end: description.end,
          }}
          createdAt={createdAt}
        />,
      );

      const unreadBadge = queryByTestId(TEST_IDS.UNREAD_BADGE);

      if (visible) {
        expect(unreadBadge).toBeOnTheScreen();
      } else {
        expect(unreadBadge).not.toBeOnTheScreen();
      }
    },
  );
});
