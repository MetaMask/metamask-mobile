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
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import {
  MetaMetricsEvents,
  useMetrics as mockUseMetrics,
} from '../../../hooks/useMetrics';

let mockSetDisplayNftMedia: jest.Mock;
let mockSetUseNftDetection: jest.Mock;

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

const mockNavigation = {
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => mockNavigation),
}));

jest.mock('../../../hooks/useMetrics/useMetrics');
const { trackEvent, addTraitsToUser } = mockUseMetrics();

const mockTrackEvent = jest.mocked(trackEvent);
const mockAddTraitsToUser = jest.mocked(addTraitsToUser);

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

  it('render matches snapshot', () => {
    const tree = renderWithProvider(<AutoDetectNFTSettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  describe('NFT Autodetection', () => {
    it('renders NFT autodetection switch', () => {
      const { getByTestId } = renderWithProvider(<AutoDetectNFTSettings />, {
        state: initialState,
      });
      const autoDetectSwitch = getByTestId(NFT_AUTO_DETECT_MODE_SECTION);
      expect(autoDetectSwitch).toBeTruthy();
    });

    it('toggles NFT autodetection when switch is pressed', () => {
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
        'Enable OpenSea API': 'ON',
      });
      expect(mockTrackEvent).toHaveBeenCalledWith(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.NFT_AUTO_DETECTION_ENABLED,
        )
          .addProperties({
            'NFT Autodetection': true,
            'Enable OpenSea API': true,
            location: 'app_settings',
          })
          .build(),
      );
    });

    it('does not enable display NFT media when autodetection is turned off', () => {
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
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.NFT_AUTO_DETECTION_ENABLED,
        )
          .addProperties({
            'NFT Autodetection': false,
            location: 'app_settings',
          })
          .build(),
      );
    });
  });
});
