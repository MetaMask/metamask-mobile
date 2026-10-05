import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictPositionIcon from './PredictPositionIcon';

describe('PredictPositionIcon', () => {
  it('renders the image when a uri is provided', () => {
    render(
      <PredictPositionIcon
        uri="https://example.com/icon.png"
        testID="position-icon"
      />,
    );

    expect(screen.getByTestId('position-icon').props.source).toEqual({
      uri: 'https://example.com/icon.png',
    });
  });

  it('renders a placeholder when no uri is provided', () => {
    render(<PredictPositionIcon testID="position-icon" />);

    expect(screen.getByTestId('position-icon').props.source).toBeUndefined();
  });
});
