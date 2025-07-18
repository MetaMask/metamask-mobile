import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { SamplePetNamesList } from './SamplePetNamesList';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));

// Mock the useSamplePetNames hook
jest.mock('../../hooks/useSamplePetNames', () => ({
  useSamplePetNames: jest.fn(),
}));

import { useSamplePetNames } from '../../hooks/useSamplePetNames';

const mockUseSamplePetNames = useSamplePetNames as jest.MockedFunction<
  typeof useSamplePetNames
>;

describe('SamplePetNamesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock return value
    mockUseSamplePetNames.mockReturnValue({
      petNames: [
        {
          address: '0xc6893a7d6a966535F7884A4de710111986ebB132',
          name: 'Test Account',
        },
      ],
    });
  });

  it('renders pet names from useSamplePetNames hook', async () => {
    // Arrange
    const { getByText } = renderWithProvider(
      <SamplePetNamesList chainId="0x1" onAccountPress={jest.fn()} />,
      { state: initialRootState },
    );

    // Assert
    await waitFor(() => {
      expect(getByText('Test Account')).toBeTruthy();
      expect(getByText('0xc6893...bB132')).toBeTruthy();
    });
    expect(mockUseSamplePetNames).toHaveBeenCalledWith('0x1');
  });

  it('renders empty list when no pet names exist', async () => {
    // Arrange
    mockUseSamplePetNames.mockReturnValue({ petNames: [] });

    const { queryByText } = renderWithProvider(
      <SamplePetNamesList chainId="0x1" onAccountPress={jest.fn()} />,
      { state: initialRootState },
    );

    // Assert
    await waitFor(() => {
      expect(queryByText('Test Account')).toBeNull();
    });
  });

  it('calls onAccountPress when pet name is pressed', async () => {
    const mockOnAccountPress = jest.fn();
    // Arrange
    const { getByText } = renderWithProvider(
      <SamplePetNamesList chainId="0x1" onAccountPress={mockOnAccountPress} />,
      { state: initialRootState },
    );

    // Act
    const petNameItem = getByText('Test Account');
    fireEvent.press(petNameItem);

    // Assert
    expect(mockOnAccountPress).toHaveBeenCalledWith({
      address: '0xc6893a7d6a966535F7884A4de710111986ebB132',
      name: 'Test Account',
    });
  });
});
