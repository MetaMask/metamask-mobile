import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import DisplayNFTMediaSettings from '.';
import { NFT_DISPLAY_MEDIA_MODE_SECTION } from './index.constants';
import { useMetrics } from '../../../hooks/useMetrics';
import mockedDefaultUseMetrics from '../../../hooks/useMetrics/__mocks__/useMetrics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

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

jest.mock('../../../hooks/useMetrics');

const mockTrackEvent = jest.fn();
const mockAddTraitsToUser = jest.fn();

const mockUseMetrics = jest.mocked(useMetrics);
mockUseMetrics.mockReturnValue({
  ...mockedDefaultUseMetrics(),
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
  addTraitsToUser: mockAddTraitsToUser,
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

  it('render matches snapshot', () => {
    const tree = renderWithProvider(<DisplayNFTMediaSettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  describe('Display NFT Media', () => {
    it('toggles display NFT media ON', () => {
      const { getByTestId } = renderWithProvider(<DisplayNFTMediaSettings />, {
        state: initialState,
      });
      const toggleSwitch = getByTestId(NFT_DISPLAY_MEDIA_MODE_SECTION);

      fireEvent(toggleSwitch, 'onValueChange', true);

      // only displayNftMedia should be set to true
      // useNftDetection should remain false as it's optional
      expect(mockSetDisplayNftMedia).toHaveBeenCalledWith(true);
      expect(mockSetUseNftDetection).not.toHaveBeenCalled();
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        'Enable OpenSea API': 'ON',
      });
    });

    it('toggles display NFT media OFF', () => {
      initialState.engine.backgroundState.PreferencesController.displayNftMedia =
        true;

      const { getByTestId } = renderWithProvider(<DisplayNFTMediaSettings />, {
        state: initialState,
      });
      const toggleSwitch = getByTestId(NFT_DISPLAY_MEDIA_MODE_SECTION);

      fireEvent(toggleSwitch, 'onValueChange', false);

      // Both displayNftMedia and useNftDetection should be set to false
      // as useNftDetection is dependent on displayNftMedia
      expect(mockSetDisplayNftMedia).toHaveBeenCalledWith(false);
      expect(mockSetUseNftDetection).toHaveBeenCalledWith(false);
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        'NFT Autodetection': 'OFF',
        'Enable OpenSea API': 'OFF',
      });
    });
  });
});
