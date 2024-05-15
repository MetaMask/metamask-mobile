import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import FiatOnTestnetsFriction from './FiatOnTestnetsFriction';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';

const store = configureMockStore()({});
jest.mock('@react-navigation/native');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockImplementation(() => ({})),
  useSafeAreaFrame: jest.fn().mockImplementation(() => ({})),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({ goBack: mockGoBack }),
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
});
