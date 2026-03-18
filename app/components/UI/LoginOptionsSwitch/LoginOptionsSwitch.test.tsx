import React from 'react';
import { render } from '@testing-library/react-native';
import LoginOptionsSwitch from './LoginOptionsSwitch';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
describe('LoginWithBiometricsSwitch', () => {
  const mockStore = configureMockStore();
  // eslint-disable-next-line no-empty-function
  const handleUpdate = (_biometricsEnabled: boolean) => {};
  it('should render correctly', () => {
    const store = mockStore({ security: { allowLoginWithRememberMe: false } });
    const component = render(
      <Provider store={store}>
        <LoginOptionsSwitch
          shouldRenderBiometricOption={BIOMETRY_TYPE.FACE}
          biometryChoiceState
          onUpdateBiometryChoice={handleUpdate}
          onUpdateRememberMe={handleUpdate}
        />
      </Provider>,
    );
    expect(component).toMatchSnapshot();
  });

  it('should return empty object when shouldRenderBiometricOption is undefined and allowLoginWithRememberMe is false in settings', () => {
    const store = mockStore({ security: { allowLoginWithRememberMe: false } });
    const component = render(
      <Provider store={store}>
        <LoginOptionsSwitch
          onUpdateBiometryChoice={handleUpdate}
          onUpdateRememberMe={handleUpdate}
          biometryChoiceState
          shouldRenderBiometricOption={null}
        />
      </Provider>,
    );
    expect(component).toMatchSnapshot();
  });
});
