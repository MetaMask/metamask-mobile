import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import NftFullView from './NftFullView';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../UI/NftGrid/NftGrid', () => 'NftGrid');

describe('NftFullView', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders NftGrid with isFullView prop', () => {
    // Arrange & Act
    const { UNSAFE_getByType } = renderWithProvider(<NftFullView />, {
      state: initialState,
    });

    // Assert
    const nftGrid = UNSAFE_getByType('NftGrid');
    expect(nftGrid.props.isFullView).toBe(true);
  });

  it('navigates back when back button is pressed', () => {
    // Arrange
    const { getByTestId } = renderWithProvider(<NftFullView />, {
      state: initialState,
    });

    // Act
    const backButton = getByTestId('header-back-button');
    fireEvent.press(backButton);

    // Assert
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('displays collectibles header title', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<NftFullView />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Collectibles')).toBeOnTheScreen();
  });
});
