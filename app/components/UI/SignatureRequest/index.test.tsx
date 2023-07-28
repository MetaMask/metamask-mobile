import React from 'react';
import { shallow } from 'enzyme';
import SignatureRequest from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);

describe('SignatureRequest', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <SignatureRequest
          currentPageInformation={{ title: 'title', url: 'url' }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
