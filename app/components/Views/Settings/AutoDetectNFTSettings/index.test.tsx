// Third party dependencies
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies
import Engine from '../../../../core/Engine';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';

// Internal dependencies
import AutoDetectNFTSettings from './index';
import { NFT_AUTO_DETECT_MODE_SECTION } from './index.constants';

let mockSetDisplayNftMedia: jest.Mock;
let mockSetUseNftDetection: jest.Mock;
let mockAddTraitsToUser: jest.Mock;
let mockTrackEvent: jest.Mock;

beforeEach(() => {
  mockSetDisplayNftMedia.mockClear();
  mockSetUseNftDetection.mockClear();
  mockAddTraitsToUser.mockClear();
  mockTrackEvent.mockClear();
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetDisplayNftMedia = jest.fn();
  mockSetUseNftDetection = jest.fn();
  mockAddTraitsToUser = jest.fn();
  mockTrackEvent = jest.fn();
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

const mockNavigation = {
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => mockNavigation),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    addTraitsToUser: mockAddTraitsToUser,
    trackEvent: mockTrackEvent,
  }),
  MetaMetricsEvents: {
    NFT_AUTO_DETECTION_ENABLED: 'NFT_AUTO_DETECTION_ENABLED',
  },
}));

jest.mock('../../../../util/general', () => ({
  timeoutFetch: jest.fn(),
}));

describe('AutoDetectNFTSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockImplementation(() => mockNavigation);
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
    const tree = renderWithProvider(<AutoDetectNFTSettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  describe('NFT Autodetection', () => {
    it('should render NFT autodetection switch', () => {
      const { getByTestId } = renderWithProvider(<AutoDetectNFTSettings />, {
        state: initialState,
      });
      const autoDetectSwitch = getByTestId(NFT_AUTO_DETECT_MODE_SECTION);
      expect(autoDetectSwitch).toBeTruthy();
    });

    it('should toggle NFT autodetection when switch is pressed', () => {
      const { getByTestId } = renderWithProvider(<AutoDetectNFTSettings />, {
        state: initialState,
      });
      const autoDetectSwitch = getByTestId(NFT_AUTO_DETECT_MODE_SECTION);
      fireEvent(autoDetectSwitch, 'onValueChange', true);

      expect(
        Engine.context.PreferencesController.setUseNftDetection,
      ).toHaveBeenCalledWith(true);
      expect(
        Engine.context.PreferencesController.setDisplayNftMedia,
      ).toHaveBeenCalledWith(true);
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        'NFT Autodetection': 'ON',
      });
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'NFT_AUTO_DETECTION_ENABLED',
        {
          'NFT Autodetection': 'ON',
          location: 'app_settings',
        },
      );
    });

    it('should not enable display NFT media when autodetection is turned off', () => {
      const { getByTestId } = renderWithProvider(<AutoDetectNFTSettings />, {
        state: initialState,
      });
      const autoDetectSwitch = getByTestId(NFT_AUTO_DETECT_MODE_SECTION);
      expect(autoDetectSwitch).toBeTruthy();

      fireEvent(autoDetectSwitch, 'onValueChange', false);

      expect(mockSetUseNftDetection).toHaveBeenCalledWith(false);
      expect(mockSetDisplayNftMedia).not.toHaveBeenCalled();
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        'NFT Autodetection': 'OFF',
      });
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'NFT_AUTO_DETECTION_ENABLED',
        {
          'NFT Autodetection': 'OFF',
          location: 'app_settings',
        },
      );
    });
  });
});
