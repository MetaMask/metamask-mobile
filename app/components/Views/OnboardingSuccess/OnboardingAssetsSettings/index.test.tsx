import React from 'react';
import { useNavigation } from '@react-navigation/native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import OnboardingAssetSettings from '.';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

describe('OnboardingAssetSettings', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        PreferencesController: {
          ...backgroundState.PreferencesController,
          useTokenDetection: true,
          displayNftMedia: false,
          useNftDetection: false,
        },
      },
    },
    network: {
      provider: {
        chainId: '1',
      },
    },
  };

  it('should render correctly', () => {
    const tree = renderWithProvider(<OnboardingAssetSettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  it('sets navigation options', () => {
    renderWithProvider(<OnboardingAssetSettings />, {
      state: initialState,
    });
    expect(mockNavigation.setOptions).toHaveBeenCalled();
  });
});
