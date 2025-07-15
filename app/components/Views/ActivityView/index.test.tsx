import React from 'react';
import ActivityView from '.';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { fireEvent } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as networkUtils from '../../../util/networks';
// eslint-disable-next-line import/no-namespace
import * as networkManagerUtils from '../../UI/NetworkManager';
// eslint-disable-next-line import/no-namespace
import * as tokenBottomSheetUtils from '../../UI/Tokens/TokensBottomSheet';

const Stack = createStackNavigator();

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  dangerouslyGetParent: () => ({
    pop: jest.fn(),
  }),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      getOrAddQRKeyring: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../hooks/useNetworksByNamespace', () => ({
  useNetworksByNamespace: () => ({
    networks: [],
    selectNetwork: jest.fn(),
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
  }),
  NetworkType: {
    Popular: 'popular',
    Custom: 'custom',
  },
}));

jest.mock('../../hooks/useNetworkSelection', () => ({
  useNetworkSelection: () => ({
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
  }),
}));

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (state: any = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Amount" options={{}}>
        {() => <ActivityView />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

const mockInitialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState,
  },
};

describe('ActivityView', () => {
  it('should render correctly', () => {
    const { toJSON } = renderComponent(mockInitialState);
    expect(toJSON()).toMatchSnapshot();
  });

  describe('filter controls', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('navigates to network manager when global network selector is enabled', () => {
      const mockNetworkManagerNavDetails = [
        'NetworkManager',
        { screen: 'NetworkSelector' },
      ] as const;

      const spyOnIsRemoveGlobalNetworkSelectorEnabled = jest
        .spyOn(networkUtils, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(true);
      const spyOnCreateNetworkManagerNavDetails = jest
        .spyOn(networkManagerUtils, 'createNetworkManagerNavDetails')
        .mockReturnValue(mockNetworkManagerNavDetails);

      const { getByTestId } = renderComponent(mockInitialState);

      const filterControlsButton = getByTestId('token-network-filter');
      fireEvent.press(filterControlsButton);

      expect(spyOnIsRemoveGlobalNetworkSelectorEnabled).toHaveBeenCalledTimes(
        9,
      );
      expect(spyOnCreateNetworkManagerNavDetails).toHaveBeenCalledWith({});
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        ...mockNetworkManagerNavDetails,
      );

      spyOnIsRemoveGlobalNetworkSelectorEnabled.mockRestore();
      spyOnCreateNetworkManagerNavDetails.mockRestore();
    });

    it('navigates to token bottom sheet filter when global network selector is disabled', () => {
      const mockTokenBottomSheetNavDetails = [
        'TokenBottomSheet',
        { screen: 'TokenFilter' },
      ] as const;

      const spyOnIsRemoveGlobalNetworkSelectorEnabled = jest
        .spyOn(networkUtils, 'isRemoveGlobalNetworkSelectorEnabled')
        .mockReturnValue(false);
      const spyOnCreateTokenBottomSheetFilterNavDetails = jest
        .spyOn(tokenBottomSheetUtils, 'createTokenBottomSheetFilterNavDetails')
        .mockReturnValue(mockTokenBottomSheetNavDetails);

      const { getByTestId } = renderComponent(mockInitialState);

      const filterControlsButton = getByTestId('token-network-filter');
      fireEvent.press(filterControlsButton);

      expect(spyOnIsRemoveGlobalNetworkSelectorEnabled).toHaveBeenCalledTimes(
        9,
      );
      expect(spyOnCreateTokenBottomSheetFilterNavDetails).toHaveBeenCalledWith(
        {},
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        ...mockTokenBottomSheetNavDetails,
      );

      spyOnIsRemoveGlobalNetworkSelectorEnabled.mockRestore();
      spyOnCreateTokenBottomSheetFilterNavDetails.mockRestore();
    });
  });
});
