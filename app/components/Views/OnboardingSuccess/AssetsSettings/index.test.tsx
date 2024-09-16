import React from 'react';
import { useNavigation } from '@react-navigation/native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import AssetSettings from './';
import { backgroundState } from '../../../../util/test/initial-root-state';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

describe('AssetSettings', () => {
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
    const tree = renderWithProvider(<AssetSettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  it('sets navigation options', () => {
    renderWithProvider(<AssetSettings />, {
      state: initialState,
    });
    expect(mockNavigation.setOptions).toHaveBeenCalled();
  });
});
