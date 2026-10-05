import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Image } from 'expo-image';
import AvatarPredict from './AvatarPredict';

describe('AvatarPredict', () => {
  it('renders the image inside the avatar', () => {
    render(
      <AvatarPredict
        uri="https://example.com/icon.png"
        testID="avatar-predict"
      />,
    );

    expect(screen.getByTestId('avatar-predict')).toBeOnTheScreen();
    expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
      uri: 'https://example.com/icon.png',
    });
    expect(screen.UNSAFE_getByType(Image).props.style).toEqual(
      expect.objectContaining({ height: '100%', width: '100%' }),
    );
  });

  it('renders the avatar placeholder when no uri is provided', () => {
    render(<AvatarPredict testID="avatar-predict" />);

    expect(screen.getByTestId('avatar-predict')).toBeOnTheScreen();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });
});
