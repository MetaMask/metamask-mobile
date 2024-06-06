import React from 'react';

import NotificationBadge from '.';
import { createStyles } from '../styles';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../../util/theme';
import { TRIGGER_TYPES } from '../../../../../util/notifications';

jest.mock('@react-navigation/native');

describe('NotificationBadge', () => {
  let styles: Record<string, any>;
  beforeEach(() => {
    styles = createStyles(mockTheme);
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <NotificationBadge
        styles={styles}
        notificationType={TRIGGER_TYPES.ETH_RECEIVED}
        badgeImageSource={{
          uri: 'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg',
        }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
