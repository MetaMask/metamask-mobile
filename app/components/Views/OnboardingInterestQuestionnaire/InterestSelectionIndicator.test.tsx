import React from 'react';
import { render } from '@testing-library/react-native';
import { InterestSelectionIndicator } from './InterestSelectionIndicator';

describe('InterestSelectionIndicator', () => {
  it('renders when selected', () => {
    const { toJSON } = render(<InterestSelectionIndicator isSelected />);

    expect(toJSON()).toBeTruthy();
  });

  it('renders when not selected', () => {
    const { toJSON } = render(
      <InterestSelectionIndicator isSelected={false} />,
    );

    expect(toJSON()).toBeTruthy();
  });
});
