import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import NotificationContent from './Content';

describe('NotificationContent', () => {
  const styles = {
    button: {},
    rowInsider: {},
    textBox: {},
  };
  const title = 'Welcome to the new MyMetaverse!';
  const createdAt = '2024-04-26T16:35:03.147606Z';
  const description = {
    text: 'We are excited to announce the launch of our brand new website and app!',
    asset: {
      name: 'Ethereum',
    },
  };
  const value = '100.00';

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <NotificationContent
        title={title}
        description={description}
        createdAt={createdAt}
        value={value}
        styles={styles}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders title with two parts', () => {
    const titleWithTo = 'Sent 0.01 ETH to 0x10000';
    const { getByText } = renderWithProvider(
      <NotificationContent
        title={titleWithTo}
        createdAt={createdAt}
        value={value}
        styles={styles}
      />,
    );

    expect(getByText(titleWithTo)).toBeTruthy();
  });

  it('renders title with two parts - with from', () => {
    const titleWithFrom = 'Received 0.01 ETH from 0x10000';
    const { getByText } = renderWithProvider(
      <NotificationContent
        title={titleWithFrom}
        createdAt={createdAt}
        value={value}
        styles={styles}
      />,
    );

    expect(getByText(titleWithFrom)).toBeTruthy();
  });

  it('renders description as asset and value', () => {
    const { getByText } = renderWithProvider(
      <NotificationContent
        title={title}
        description={description}
        createdAt={createdAt}
        value={value}
        styles={styles}
      />,
    );

    expect(getByText(description.asset.name)).toBeTruthy();
    expect(getByText(value)).toBeTruthy();
  });

  it('renders description as text and value', () => {
    const { getByText } = renderWithProvider(
      <NotificationContent
        title={title}
        description={{
          text: 'We are excited to announce the launch of our brand new website and app!',
        }}
        createdAt={createdAt}
        value={value}
        styles={styles}
      />,
    );

    expect(
      getByText(
        'We are excited to announce the launch of our brand new website and app!',
      ),
    ).toBeTruthy();
    expect(getByText(value)).toBeTruthy();
  });
});
