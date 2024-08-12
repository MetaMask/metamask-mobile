import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';

import NotificationBadge from '.';
import { createStyles } from '../styles';
import { mockTheme } from '../../../../../util/theme';
import { TRIGGER_TYPES } from '../../../../../util/notifications';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('@react-navigation/native');

const mockedTheme = createStyles(mockTheme);
const mockStyles = {
  ...mockedTheme,
};

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

describe('NotificationBadge', () => {
  const mockStore = configureMockStore();
  const store = mockStore(mockInitialState);
  const commonProps = {
    styles: mockStyles,
    badgeImageSource: { uri: 'badgeImage' },
    imageUrl:
      'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg',
  };

  it('should renders correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <NotificationBadge
          {...commonProps}
          notificationType={TRIGGER_TYPES.ETH_RECEIVED}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should renders NetworkMainAssetLogo for ETH notification types', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <NotificationBadge
          {...commonProps}
          notificationType={TRIGGER_TYPES.ETH_RECEIVED}
        />
      </Provider>,
    );
    expect(getByTestId('network-main-asset-badge')).toBeTruthy();
  });

  it('should renders AvatarToken for NFT notification types', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <NotificationBadge
          {...commonProps}
          notificationType={TRIGGER_TYPES.ERC721_RECEIVED}
        />
      </Provider>,
    );
    expect(getByTestId('avatar-asset-badge')).toBeTruthy();
  });

  it('should renders AvatarToken for non-ETH and non-NFT notification types', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <NotificationBadge
          {...commonProps}
          notificationType={TRIGGER_TYPES.LIDO_STAKE_COMPLETED}
        />
      </Provider>,
    );
    expect(getByTestId('avatar-asset-badge')).toBeTruthy();
  });
});
