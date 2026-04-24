import React from 'react';
import { useNavigation } from '@react-navigation/native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { strings } from '../../../../../locales/i18n';
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
    const { getByText } = renderWithProvider(<OnboardingAssetSettings />, {
      state: initialState,
    });
    expect(
      getByText(strings('app_settings.token_detection_title')),
    ).toBeOnTheScreen();
  });

  it('sets navigation options', () => {
    renderWithProvider(<OnboardingAssetSettings />, {
      state: initialState,
    });
    expect(mockNavigation.setOptions).toHaveBeenCalled();
  });
});
