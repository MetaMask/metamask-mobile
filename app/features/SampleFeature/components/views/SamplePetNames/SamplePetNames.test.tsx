import React from 'react';
import { View } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';
import { waitFor } from '@testing-library/react-native';
import { SamplePetNames } from './SamplePetNames';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

/**
 * Mock variables for child components
 */
const MockView = View;

/**
 * Mock child components to isolate SamplePetNames testing
 */
jest.mock('./SamplePetNamesList', () => ({
  SamplePetNamesList: () => <MockView testID="mocked-sample-pet-names-list" />,
}));

jest.mock('./SamplePetNamesForm', () => ({
  SamplePetNamesForm: () => <MockView testID="mocked-sample-pet-names-form" />,
}));

/**
 * Mock hooks
 */
jest.mock('../../hooks/useSampleNetwork/useSampleNetwork', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chainId: '0x1',
    network: 'Ethereum Mainnet',
  })),
}));

describe('SamplePetNames', () => {
  it('renders child components', async () => {
    const { getByTestId } = renderWithProvider(<SamplePetNames />, {
      state: initialRootState,
    });

    await waitFor(() => {
      expect(getByTestId('mocked-sample-pet-names-list')).toBeOnTheScreen();
      expect(getByTestId('mocked-sample-pet-names-form')).toBeOnTheScreen();
    });
  });
});
