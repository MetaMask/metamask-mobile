import React from 'react';
import { render } from '@testing-library/react-native';
import FoxLoader from './FoxLoader';

const mockOnAnimationComplete = jest.fn();

describe('FoxLoader', () => {
  it('renders correctly and matches snapshot', () => {
    const { toJSON } = render(
      <FoxLoader
        appServicesReady={false}
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
