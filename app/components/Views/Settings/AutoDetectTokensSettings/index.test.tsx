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

let mockSetUseTokenDetection: jest.Mock;

beforeEach(() => {
  mockSetUseTokenDetection.mockClear();
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetUseTokenDetection = jest.fn();
  return {
    init: () => mockEngine.init({}),
    context: {
      PreferencesController: {
        setUseTokenDetection: mockSetUseTokenDetection,
      },
    },
  };
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

  it('should render correctly', () => {
    const tree = renderWithProvider(<AssetSettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  describe('Token Detection', () => {
    it('should toggle token detection when switch is pressed', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });
      const toggleSwitch = getByTestId(TOKEN_DETECTION_TOGGLE);
      fireEvent(toggleSwitch, 'onValueChange', false);
      expect(mockSetUseTokenDetection).toHaveBeenCalledWith(false);
    });
  });
});
