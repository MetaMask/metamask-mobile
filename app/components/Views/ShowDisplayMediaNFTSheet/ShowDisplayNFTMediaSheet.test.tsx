import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

import ShowDisplayNFTMediaSheet from './ShowDisplayNFTMediaSheet';
import Routes from '../../../constants/navigation/Routes';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';

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

jest.mock('../../hooks/useAnalytics/useAnalytics');

const mockIdentify = jest.fn();

jest.mocked(useAnalytics).mockReturnValue(
  createMockUseAnalyticsHook({
    identify: mockIdentify,
  }),
);

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
    expect(mockIdentify).toHaveBeenCalledWith({
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
    expect(mockIdentify).not.toHaveBeenCalled();
  });
});
