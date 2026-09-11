import { AvatarAccount } from '@metamask/design-system-react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { Image } from 'expo-image';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TraderHeaderIdentity from './TraderHeaderIdentity';

const REAL_AVATAR_URL = 'https://example.com/avatar.png';
const TRADER_ADDRESS = '0x0000000000000000000000000000000000000001';

describe('TraderHeaderIdentity', () => {
  it('renders the trader name', () => {
    renderWithProvider(
      <TraderHeaderIdentity traderName="trader-1" testID="trader-identity" />,
    );

    expect(screen.getByText('trader-1')).toBeOnTheScreen();
  });

  it('renders the avatar image when a real image url is provided', () => {
    renderWithProvider(
      <TraderHeaderIdentity
        traderName="trader-1"
        traderImageUrl={REAL_AVATAR_URL}
        traderAddress={TRADER_ADDRESS}
      />,
    );

    expect(screen.UNSAFE_queryByType(Image)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(AvatarAccount)).toBeNull();
  });

  it('calls onPress when the identity is pressable', () => {
    const onPress = jest.fn();

    renderWithProvider(
      <TraderHeaderIdentity
        traderName="trader-1"
        onPress={onPress}
        testID="trader-identity"
      />,
    );

    fireEvent.press(screen.getByTestId('trader-identity'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
