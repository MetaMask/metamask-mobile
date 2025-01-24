import React from 'react';
import { shallow } from 'enzyme';
import Collectible from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
  modals: {
    collectibleContractModalVisible: false,
  },
};
const store = mockStore(initialState);

describe('Collectible', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Collectible route={{ params: { address: '0x1' } }} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
