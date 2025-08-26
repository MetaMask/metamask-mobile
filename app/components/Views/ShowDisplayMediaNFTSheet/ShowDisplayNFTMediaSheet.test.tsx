import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

import ShowDisplayNFTMediaSheet from './ShowDisplayNFTMediaSheet';
import Routes from '../../../constants/navigation/Routes';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import { useMetrics } from '../../hooks/useMetrics';

const setDisplayNftMediaSpy = jest.spyOn(
  Engine.context.PreferencesController,
  'setDisplayNftMedia',
);
jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setUseNftDetection: jest.fn(),
      setDisplayNftMedia: jest.fn(),
    },
  },
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

jest.mock('../../hooks/useMetrics');

const mockAddTraitsToUser = jest.fn();

(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: jest.fn(),
  createEventBuilder: jest.fn(),
  enable: jest.fn(),
  addTraitsToUser: mockAddTraitsToUser,
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getMetaMetricsId: jest.fn(),
});

const Stack = createStackNavigator();

describe('ShowNftSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <Stack.Navigator>
        <Stack.Screen name={Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA}>
          {() => <ShowDisplayNFTMediaSheet />}
        </Stack.Screen>
      </Stack.Navigator>,
      {
        state: initialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('setDisplayNftMedia to true on confirm', () => {
    const { getByText } = renderWithProvider(
      <Stack.Navigator>
        <Stack.Screen name={Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA}>
          {() => <ShowDisplayNFTMediaSheet />}
        </Stack.Screen>
      </Stack.Navigator>,
      {
        state: initialState,
      },
    );

    const confirmButton = getByText('Confirm');

    fireEvent.press(confirmButton);

    expect(setDisplayNftMediaSpy).toHaveBeenCalledWith(true);
    expect(mockAddTraitsToUser).toHaveBeenCalledWith({
      'Enable OpenSea API': 'ON',
    });
  });

  it('do not call setDisplayNftMedia on cancel', () => {
    const { getByText } = renderWithProvider(
      <Stack.Navigator>
        <Stack.Screen name={Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA}>
          {() => <ShowDisplayNFTMediaSheet />}
        </Stack.Screen>
      </Stack.Navigator>,
      {
        state: initialState,
      },
    );

    const cancelButton = getByText('Cancel');

    fireEvent.press(cancelButton);

    expect(setDisplayNftMediaSpy).not.toHaveBeenCalled();
    expect(mockAddTraitsToUser).not.toHaveBeenCalled();
  });
});
