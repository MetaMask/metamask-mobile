// Third party dependencies
import React from 'react';
import { fireEvent } from '@testing-library/react-native';

// External dependencies
import Engine from '../../../../core/Engine';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';

// Internal dependencies
import AssetSettings from '.';
import { TOKEN_DETECTION_TOGGLE } from './index.constants';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';

let mockSetUseTokenDetection: jest.Mock;

beforeEach(() => {
  mockSetUseTokenDetection.mockClear();
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetUseTokenDetection = jest.fn();
  return {
    init: () => mockEngine.init(''),
    context: {
      PreferencesController: {
        setUseTokenDetection: mockSetUseTokenDetection,
      },
    },
  };
});

jest.mock('../../../hooks/useAnalytics/useAnalytics');

const mockAddTraitsToUser = jest.fn();

(useAnalytics as jest.MockedFn<typeof useAnalytics>).mockReturnValue({
  createEventBuilder: jest.fn(() => ({
    addProperties: jest.fn().mockReturnThis(),
    addSensitiveProperties: jest.fn().mockReturnThis(),
    removeProperties: jest.fn().mockReturnThis(),
    removeSensitiveProperties: jest.fn().mockReturnThis(),
    setSaveDataRecording: jest.fn().mockReturnThis(),
    build: jest.fn(),
  })) as ReturnType<typeof useAnalytics>['createEventBuilder'],
  trackEvent: jest.fn(),
  enable: jest.fn(),
  addTraitsToUser: mockAddTraitsToUser,
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getAnalyticsId: jest.fn(),
});

describe('AssetSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        PreferencesController: {
          ...backgroundState.PreferencesController,
          useTokenDetection: true,
        },
      },
    },
  };

  it('render matches snapshot', () => {
    const tree = renderWithProvider(<AssetSettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  describe('Token Detection', () => {
    it('toggles token detection off', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });
      const toggleSwitch = getByTestId(TOKEN_DETECTION_TOGGLE);
      fireEvent(toggleSwitch, 'onValueChange', false);
      expect(mockSetUseTokenDetection).toHaveBeenCalledWith(false);
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        token_detection_enable: 'OFF',
      });
    });

    it('toggles token detection on', () => {
      initialState.engine.backgroundState.PreferencesController.useTokenDetection = false;
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });
      const toggleSwitch = getByTestId(TOKEN_DETECTION_TOGGLE);
      fireEvent(toggleSwitch, 'onValueChange', true);
      expect(mockSetUseTokenDetection).toHaveBeenCalledWith(true);
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        token_detection_enable: 'ON',
      });
    });
  });
});
