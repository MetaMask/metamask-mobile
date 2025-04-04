import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import DisplayNFTMediaSettings from '.';
import { NFT_DISPLAY_MEDIA_MODE_SECTION } from './index.constants';

let mockSetDisplayNftMedia: jest.Mock;
let mockSetUseNftDetection: jest.Mock;

beforeEach(() => {
  mockSetDisplayNftMedia.mockClear();
  mockSetUseNftDetection.mockClear();
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetDisplayNftMedia = jest.fn();
  mockSetUseNftDetection = jest.fn();
  return {
    init: () => mockEngine.init({}),
    context: {
      PreferencesController: {
        setDisplayNftMedia: mockSetDisplayNftMedia,
        setUseNftDetection: mockSetUseNftDetection,
      },
    },
  };
});

describe('DisplayNFTMediaSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        PreferencesController: {
          ...backgroundState.PreferencesController,
          displayNftMedia: false,
          useNftDetection: false,
        },
      },
    },
  };

  it('should render correctly', () => {
    const tree = renderWithProvider(<DisplayNFTMediaSettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  describe('Display NFT Media', () => {
    it('should toggle display NFT media when switch is pressed', () => {
      const { getByTestId } = renderWithProvider(<DisplayNFTMediaSettings />, {
        state: initialState,
      });
      const toggleSwitch = getByTestId(NFT_DISPLAY_MEDIA_MODE_SECTION);

      fireEvent(toggleSwitch, 'onValueChange', true);
      expect(mockSetDisplayNftMedia).toHaveBeenCalledWith(true);
      expect(mockSetUseNftDetection).not.toHaveBeenCalled();

      fireEvent(toggleSwitch, 'onValueChange', false);
      expect(mockSetDisplayNftMedia).toHaveBeenCalledWith(false);
      expect(mockSetUseNftDetection).toHaveBeenCalledWith(false);
    });
  });
});
