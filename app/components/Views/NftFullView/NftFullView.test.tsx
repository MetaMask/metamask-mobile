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

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { TouchableOpacity, View, Text } = jest.requireActual('react-native');
    return ({
      children,
      onBack,
    }: {
      children: React.ReactNode;
      onBack: () => void;
    }) => (
      <View testID="bottom-sheet-header">
        <TouchableOpacity testID="header-back-button" onPress={onBack}>
          <Text>Back</Text>
        </TouchableOpacity>
        <Text testID="header-title">{children}</Text>
      </View>
    );
  },
);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nftGrid = UNSAFE_getByType('NftGrid' as any);
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

  it('displays NFTs header title', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(<NftFullView />, {
      state: initialState,
    });

    // Assert
    expect(getByTestId('header-title')).toBeOnTheScreen();
  });
});
