import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AvatarPredict from './AvatarPredict';
import { AvatarPredictSelectorsIDs } from './AvatarPredict.testIds';

const MOCK_SRC = { uri: 'https://example.com/predict-icon.png' };

describe('AvatarPredict', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the image from src', () => {
    render(<AvatarPredict src={MOCK_SRC} />);

    const image = screen.getByTestId(AvatarPredictSelectorsIDs.IMAGE);

    expect(image).toBeOnTheScreen();
    expect(image.props.source).toEqual(MOCK_SRC);
  });

  it('omits the image when src is missing', () => {
    render(<AvatarPredict />);

    expect(
      screen.queryByTestId(AvatarPredictSelectorsIDs.IMAGE),
    ).not.toBeOnTheScreen();
  });

  it('omits the image when src has no uri', () => {
    render(<AvatarPredict src={{}} />);

    expect(
      screen.queryByTestId(AvatarPredictSelectorsIDs.IMAGE),
    ).not.toBeOnTheScreen();
  });
});
