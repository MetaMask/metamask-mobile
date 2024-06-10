import React from 'react';
import { shallow } from 'enzyme';
import NFTAutoDetectionModal from './NFTAutoDetectionModal';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';

const mockStore = createMockStore();
const initialState = {};
const store = mockStore(initialState);

describe('NFT Auto detection modal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <NFTAutoDetectionModal />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
