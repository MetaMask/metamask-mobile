import React from 'react';
import MultiRpcModal from './MultiRpcModal';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { fireEvent } from '@testing-library/react-native';
import { RootState } from 'app/reducers';
import { backgroundState } from '../../../util/test/initial-root-state';

const setShowMultiRpcModalSpy = jest.spyOn(
  Engine.context.PreferencesController,
  'setShowMultiRpcModal',
);

jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setShowMultiRpcModal: jest.fn(),
    },
  },
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

const Stack = createStackNavigator();

const renderComponent = (state: DeepPartial<RootState> = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name={Routes.MODAL.MULTI_RPC_MIGRATION_MODAL}>
        {() => <MultiRpcModal />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('MultiRpcModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls setShowMultiRpcModal and trackEvent when clicking on allow button', () => {
    const { getByTestId } = renderComponent(initialState);
    const allowButton = getByTestId('allow');

    fireEvent.press(allowButton);
    expect(setShowMultiRpcModalSpy).toHaveBeenCalledWith(false);
  });
});
