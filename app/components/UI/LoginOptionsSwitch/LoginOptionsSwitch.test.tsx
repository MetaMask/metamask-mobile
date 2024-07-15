import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoginOptionsSwitch from './LoginOptionsSwitch';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

describe('LoginOptionsSwitch', () => {
  const mockStore = configureMockStore();
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleUpdate = (_biometricsEnabled: boolean) => {};

  it('should render correctly with biometric option', () => {
    const store = mockStore({});
    const { toJSON } = render(
      <Provider store={store}>
        <LoginOptionsSwitch
          shouldRenderBiometricOption={BIOMETRY_TYPE.FACE}
          biometryChoiceState
          onUpdateBiometryChoice={handleUpdate}
          onUpdateRememberMe={handleUpdate}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
    expect(screen.getByText('Face ID')).toBeTruthy();
    expect(screen.getByText('Remember me')).toBeTruthy();
  });

  it('should not render biometric option when shouldRenderBiometricOption is null', () => {
    const store = mockStore({});
    render(
      <Provider store={store}>
        <LoginOptionsSwitch
          onUpdateBiometryChoice={handleUpdate}
          onUpdateRememberMe={handleUpdate}
          biometryChoiceState
          shouldRenderBiometricOption={null}
        />
      </Provider>,
    );
    expect(screen.queryByText('Face ID')).toBeNull();
    expect(screen.getByText('Remember me')).toBeTruthy();
  });
});