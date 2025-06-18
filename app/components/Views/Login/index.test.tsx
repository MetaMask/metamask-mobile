import React from 'react';
import Login from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { InteractionManager } from 'react-native';
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        locked: false,
      },
    }),
  };
});
const mockRunAfterInteractions = jest.fn().mockImplementation((cb) => {
  cb();
  return {
    then: (onfulfilled: () => void) => Promise.resolve(onfulfilled()),
    done: (onfulfilled: () => void, onrejected: () => void) =>
      Promise.resolve().then(onfulfilled, onrejected),
    cancel: jest.fn(),
  };
});
jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation(mockRunAfterInteractions);

describe('Login', () => {
  it('renders matching snapshot', () => {
    const { toJSON } = renderWithProvider(<Login />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders matching snapshot when password input is focused', () => {
    const { getByTestId, toJSON } = renderWithProvider(<Login />);

    fireEvent.changeText(
      getByTestId(LoginViewSelectors.PASSWORD_INPUT),
      'password',
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
