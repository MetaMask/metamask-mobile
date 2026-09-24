import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import CL24BenchmarkDeveloperOptionsSection from './CL24BenchmarkDeveloperOptionsSection';

jest.mock('../../Onboarding/CL24Benchmark', () => {
  const { Text } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: () => (
      <Text testID="onboarding-cl24-benchmark-button">Run CL24</Text>
    ),
  };
});

describe('CL24BenchmarkDeveloperOptionsSection', () => {
  it('renders the CL24 benchmark entry point', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <CL24BenchmarkDeveloperOptionsSection />,
    );

    expect(getByText('CL24 DKM')).toBeOnTheScreen();
    expect(getByTestId('onboarding-cl24-benchmark-button')).toBeOnTheScreen();
  });
});
