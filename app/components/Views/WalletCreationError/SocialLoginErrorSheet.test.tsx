import React, { ComponentType } from 'react';
import { Image, Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import SocialLoginErrorSheet from './SocialLoginErrorSheet';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { Authentication } from '../../../core';
import AppConstants from '../../../core/AppConstants';
import Routes from '../../../constants/navigation/Routes';

// Type helper for UNSAFE_getAllByType with mocked string components
const asComponentType = (name: string) => name as unknown as ComponentType;

const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    reset: mockReset,
  }),
}));

jest.mock('../../../core', () => ({
  Authentication: {
    deleteWallet: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

describe('SocialLoginErrorSheet', () => {
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

  it('renders error title', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<SocialLoginErrorSheet />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Something went wrong')).toBeOnTheScreen();
  });

  it('renders try again button', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<SocialLoginErrorSheet />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Try again')).toBeOnTheScreen();
  });

  it('renders MetaMask Support link', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<SocialLoginErrorSheet />, {
      state: initialState,
    });

    // Assert
    expect(getByText('MetaMask Support')).toBeOnTheScreen();
  });

  it('deletes wallet and resets navigation when try again is pressed', async () => {
    // Arrange
    (Authentication.deleteWallet as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = renderWithProvider(<SocialLoginErrorSheet />, {
      state: initialState,
    });
    const tryAgainButton = getByText('Try again');

    // Act
    fireEvent.press(tryAgainButton);

    // Assert
    await waitFor(() => {
      expect(Authentication.deleteWallet).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
      });
    });
  });

  it('opens support URL when MetaMask Support is pressed', () => {
    // Arrange
    const { getByText } = renderWithProvider(<SocialLoginErrorSheet />, {
      state: initialState,
    });
    const supportLink = getByText('MetaMask Support');

    // Act
    fireEvent.press(supportLink);

    // Assert
    expect(Linking.openURL).toHaveBeenCalledWith(
      AppConstants.REVIEW_PROMPT.SUPPORT,
    );
  });

  it('renders fox logo image', () => {
    // Arrange & Act
    const { UNSAFE_getAllByType } = renderWithProvider(
      <SocialLoginErrorSheet />,
      {
        state: initialState,
      },
    );

    // Assert
    const images = UNSAFE_getAllByType(Image);
    expect(images.length).toBeGreaterThan(0);
  });

  it('renders danger icon', () => {
    // Arrange & Act
    const { UNSAFE_getAllByType } = renderWithProvider(
      <SocialLoginErrorSheet />,
      {
        state: initialState,
      },
    );

    // Assert
    const icons = UNSAFE_getAllByType(asComponentType('SvgMock'));
    expect(icons.length).toBeGreaterThan(0);
  });
});
