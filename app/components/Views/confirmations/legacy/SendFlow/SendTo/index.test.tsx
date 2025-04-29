import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { Store } from 'redux';

import SendTo from './index';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';
import initialRootState from '../../../../../../util/test/initial-root-state';
import { validateAddressOrENS } from '../../../../../../util/address';

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
      settings: { useBlockieIcon: false },
    });

    mockValidateAddressOrENS.mockResolvedValue(
      {} as unknown as ReturnType<typeof validateAddressOrENS>,
    );
  });

  it('should render', () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should navigate to Amount screen', () => {
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
});
