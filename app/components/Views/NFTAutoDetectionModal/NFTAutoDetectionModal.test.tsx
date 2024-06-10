import React from 'react';
import NFTAutoDetectionModal from './NFTAutoDetectionModal';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { fireEvent } from '@testing-library/react-native';

const mockEngine = Engine;

const setUseNftDetectionSpy = jest.spyOn(
  Engine.context.PreferencesController,
  'setUseNftDetection',
);

jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  context: {
    PreferencesController: {
      setUseNftDetection: jest.fn(),
    },
  },
}));

const initialState = {};

const Stack = createStackNavigator();

const renderComponent = (state: any = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name={Routes.MODAL.NFT_AUTO_DETECTION_MODAL}>
        {() => <NFTAutoDetectionModal />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );
describe('NFT Auto detection modal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should render correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call setUseNftDetection when clicking on allow button', () => {
    const { getByTestId } = renderComponent(initialState);
    const allowButton = getByTestId('allow');

    fireEvent.press(allowButton);
    expect(setUseNftDetectionSpy).toHaveBeenCalled();
  });

  it('should not call setUseNftDetection when clicking on not right now button', () => {
    const { getByTestId } = renderComponent(initialState);
    const cancelButton = getByTestId('cancel');

    fireEvent.press(cancelButton);
    expect(setUseNftDetectionSpy).not.toHaveBeenCalled();
  });
});
