import React from 'react';

import NotificationBadge from '.';
import { createStyles } from '../styles';
import { mockTheme } from '../../../../../util/theme';
import { TRIGGER_TYPES } from '../../../../../util/notifications';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';

jest.mock('@react-navigation/native');

const mockedTheme = createStyles(mockTheme);
const mockStyles = {
  ...mockedTheme,
};

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
  },
};

describe('NotificationBadge', () => {
  const commonProps = {
    styles: mockStyles,
    badgeImageSource: { uri: 'badgeImage' },
    imageUrl:
      'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg',
  };

  it('should renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <NotificationBadge
        {...commonProps}
        notificationType={TRIGGER_TYPES.ETH_RECEIVED}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders NetworkMainAssetLogo for ETH notification types', () => {
    const { getByTestId } = renderWithProvider(
      <NotificationBadge
        {...commonProps}
        notificationType={TRIGGER_TYPES.ETH_RECEIVED}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(getByTestId('network-main-asset-badge')).toBeTruthy();
  });

  it('renders AvatarToken for NFT notification types', () => {
    const { getByTestId } = renderWithProvider(
      <NotificationBadge
        {...commonProps}
        notificationType={TRIGGER_TYPES.ERC721_RECEIVED}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(getByTestId('avatar-asset-badge')).toBeTruthy();
    expect(getByTestId('avatar-asset-badge').props.style).toEqual(
      mockStyles.nftLogo,
    );
    expect(getByTestId('avatar-asset-badge').props.placeholderStyle).toEqual(
      mockStyles.nftPlaceholder,
    );
  });

  it('renders AvatarToken for non-ETH and non-NFT notification types', () => {
    const { getByTestId } = renderWithProvider(
      <NotificationBadge
        {...commonProps}
        notificationType={TRIGGER_TYPES.LIDO_STAKE_COMPLETED}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(getByTestId('avatar-asset-badge')).toBeTruthy();
    expect(getByTestId('avatar-asset-badge').props.style).toEqual(
      mockStyles.assetLogo,
    );
    expect(getByTestId('avatar-asset-badge').props.placeholderStyle).toEqual(
      mockStyles.assetPlaceholder,
    );
  });

  it('contains BadgeWrapper and Badge', () => {
    const { getByTestId } = renderWithProvider(
      <NotificationBadge
        {...commonProps}
        notificationType={TRIGGER_TYPES.ETH_RECEIVED}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(getByTestId('badge-wrapper')).toBeTruthy();
    expect(getByTestId('badge-element')).toBeTruthy();
  });

  it('passes correct badgeImageSource prop to Badge', () => {
    const { getByTestId } = renderWithProvider(
      <NotificationBadge
        {...commonProps}
        notificationType={TRIGGER_TYPES.ETH_RECEIVED}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(getByTestId('badge-element').props.imageSource).toEqual({
      uri: 'badgeImage',
    });
  });

  it('passes correct imageUrl prop to AvatarToken', () => {
    const { getByTestId } = renderWithProvider(
      <NotificationBadge
        {...commonProps}
        notificationType={TRIGGER_TYPES.ERC721_RECEIVED}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(getByTestId('avatar-asset-badge').props.imageSource).toEqual({
      uri: 'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg',
    });
  });
});
