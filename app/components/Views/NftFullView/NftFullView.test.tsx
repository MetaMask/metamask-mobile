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

let mockHomeBrandRefreshSurfacesEnabled = false;
jest.mock(
  '../../../selectors/featureFlagController/homeBrandRefreshSurfaces',
  () => ({
    selectHomeBrandRefreshSurfacesEnabled: () =>
      mockHomeBrandRefreshSurfacesEnabled,
  }),
);

const mockHeaderStandardGlassProps = jest.fn();
jest.mock(
  '../../../component-library/components-temp/HeaderStandardGlass',
  () => {
    const ReactActual = jest.requireActual('react');
    const ActualHeaderStandardGlass = jest.requireActual(
      '../../../component-library/components-temp/HeaderStandardGlass',
    ).default;
    return {
      __esModule: true,
      default: (props: Record<string, unknown>) => {
        mockHeaderStandardGlassProps(props);
        return ReactActual.createElement(ActualHeaderStandardGlass, props);
      },
    };
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
    mockHomeBrandRefreshSurfacesEnabled = false;
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
    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);

    // Assert
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('displays NFTs header title', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<NftFullView />, {
      state: initialState,
    });

    // Assert
    expect(getByText('NFTs')).toBeOnTheScreen();
  });

  it('keeps the hand-built header when the home brand refresh flag is off', () => {
    // Arrange & Act
    renderWithProvider(<NftFullView />, { state: initialState });

    // Assert
    expect(mockHeaderStandardGlassProps).not.toHaveBeenCalled();
  });

  it('renders the glass header and navigates back when the home brand refresh flag is on', () => {
    // Arrange
    mockHomeBrandRefreshSurfacesEnabled = true;
    const { getByTestId, getByText } = renderWithProvider(<NftFullView />, {
      state: initialState,
    });

    // Act
    fireEvent.press(getByTestId('back-button'));

    // Assert
    expect(mockHeaderStandardGlassProps).toHaveBeenCalledWith(
      expect.objectContaining({ isGlass: true, isFloating: false }),
    );
    expect(getByText('NFTs')).toBeOnTheScreen();
    expect(mockGoBack).toHaveBeenCalled();
  });
});
