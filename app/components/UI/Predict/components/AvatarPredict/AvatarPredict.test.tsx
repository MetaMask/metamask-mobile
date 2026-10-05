import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AvatarPredict from './AvatarPredict';
import { AvatarPredictSelectorsIDs } from './AvatarPredict.testIds';

const MOCK_URI = 'https://example.com/predict-icon.png';

describe('AvatarPredict', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the image with the provided uri', () => {
    render(<AvatarPredict uri={MOCK_URI} />);

    const image = screen.getByTestId(AvatarPredictSelectorsIDs.IMAGE);

    expect(image).toBeOnTheScreen();
    expect(image.props.source).toEqual({ uri: MOCK_URI });
  });

  it('renders only the avatar container when uri is omitted', () => {
    render(<AvatarPredict />);

    expect(
      screen.getByTestId(AvatarPredictSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(AvatarPredictSelectorsIDs.IMAGE),
    ).not.toBeOnTheScreen();
  });

  it('applies a custom testID to the container', () => {
    render(<AvatarPredict uri={MOCK_URI} testID="custom-avatar" />);

    expect(screen.getByTestId('custom-avatar')).toBeOnTheScreen();
  });
});
