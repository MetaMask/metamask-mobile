import React from 'react';
import { render } from '@testing-library/react-native';
import { PredictClaimBackground } from './predict-claim-background';

describe('PredictClaimBackground', () => {
  it('renders image', () => {
    const { getByTestId } = render(<PredictClaimBackground />);
    expect(getByTestId('predict-claim-background')).toBeDefined();
  });
});
