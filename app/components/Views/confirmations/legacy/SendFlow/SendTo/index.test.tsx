import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { Store } from 'redux';

import SendTo from './index';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';
import initialRootState from '../../../../../../util/test/initial-root-state';
import { validateAddressOrENS } from '../../../../../../util/address';
import { SendViewSelectorsIDs } from '../SendView.testIds';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../util/address'),
  validateAddressOrENS: jest.fn(),
}));

const mockStore = configureStore();
const navigationPropMock = {
  setOptions: jest.fn(),
  setParams: jest.fn(),
  navigate: jest.fn(),
};
const routeMock = {
  params: {},
};

describe('SendTo Component', () => {
  let store: Store;

  const mockValidateAddressOrENS = jest.mocked(validateAddressOrENS);

  beforeEach(() => {
    jest.clearAllMocks();
    store = mockStore({
      ...initialRootState,
      transaction: {
        selectedAsset: {},
      },
      settings: { avatarAccountType: AvatarAccountType.Maskicon },
    });

    mockValidateAddressOrENS.mockResolvedValue(
      {} as unknown as ReturnType<typeof validateAddressOrENS>,
    );
  });

  it('render matches snapshot', () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('navigates to Amount screen', () => {
    const MOCK_TARGET_ADDRESS = '0x0000000000000000000000000000000000000000';
    const { navigate } = navigationPropMock;
    const routeProps = {
      params: {
        txMeta: {
          target_address: MOCK_TARGET_ADDRESS,
        },
      },
    };

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeProps} />
        </ThemeContext.Provider>
      </Provider>,
    );
    fireEvent.press(screen.getByText('Next'));
    expect(navigate).toHaveBeenCalledWith('Amount');
  });

  it('shows the warning message when the target address is invalid', () => {
    const { getByText, getByTestId } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, 'invalid address');

    const expectedWarningMessage = getByText(
      'No address has been set for this name.',
    );

    expect(expectedWarningMessage).toBeOnTheScreen();
  });
});
