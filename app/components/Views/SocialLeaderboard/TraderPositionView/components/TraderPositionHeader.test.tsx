import { AvatarAccount } from '@metamask/design-system-react-native';
import { screen } from '@testing-library/react-native';
import { Image } from 'expo-image';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TraderPositionHeader from './TraderPositionHeader';

const REAL_AVATAR_URL = 'https://example.com/avatar.png';
const TRADER_ADDRESS = '0x0000000000000000000000000000000000000001';

const baseProps = {
  traderName: 'trader-1',
  onBack: jest.fn(),
  onTraderPress: jest.fn(),
  backButtonTestID: 'back-button',
  traderNameTestID: 'trader-name',
};

describe('TraderPositionHeader', () => {
  it('renders the trader name', () => {
    renderWithProvider(<TraderPositionHeader {...baseProps} />);

    expect(screen.getByText('trader-1')).toBeOnTheScreen();
  });

  it('renders the avatar image when a real image url is provided', () => {
    renderWithProvider(
      <TraderPositionHeader
        {...baseProps}
        traderImageUrl={REAL_AVATAR_URL}
        traderAddress={TRADER_ADDRESS}
      />,
    );

    expect(screen.UNSAFE_queryByType(Image)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(AvatarAccount)).toBeNull();
  });

  it('renders the Maskicon fallback when the image url is absent', () => {
    renderWithProvider(
      <TraderPositionHeader {...baseProps} traderAddress={TRADER_ADDRESS} />,
    );

    expect(screen.UNSAFE_queryByType(AvatarAccount)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });
});
