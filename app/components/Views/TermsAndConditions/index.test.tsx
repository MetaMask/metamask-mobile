import React from 'react';
import { render } from '@testing-library/react-native';
import TermsAndConditions from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('TermsAndConditions', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <TermsAndConditions action="import" />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
