import React from 'react';
import { render } from '@testing-library/react-native';
import { EnableAutomaticSecurityChecksModal } from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('EnableAutomaticSecurityChecksModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <EnableAutomaticSecurityChecksModal />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
