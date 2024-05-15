import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import FiatOnTestnetsFriction from './FiatOnTestnetsFriction';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../../app/core/AppConstants';

const store = configureMockStore()({});
jest.mock('@react-navigation/native');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockImplementation(() => ({})),
  useSafeAreaFrame: jest.fn().mockImplementation(() => ({})),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

describe('Show fiat on testnets friction bottom sheet', () => {
  it('should render', () => {
    const wrapper = render(
      <Provider store={store}>
        <FiatOnTestnetsFriction />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should close on cancel', () => {
    const { getByRole } = renderWithProvider(<FiatOnTestnetsFriction />);
    const cancelButton = getByRole('button', {
      name: strings('navigation.cancel'),
    });
    fireEvent.press(cancelButton);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('should open a website to learn more', () => {
    const { getByRole } = renderWithProvider(<FiatOnTestnetsFriction />);

    const learMoreLink = getByRole('link', {
      name: strings('app_settings.show_fiat_on_testnets_modal_learn_more'),
    });
    fireEvent.press(learMoreLink);
    expect(mockGoBack).toHaveBeenCalled();

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.TESTNET_ETH_SCAMS,
      },
    });
  });
});
