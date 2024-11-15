import React from 'react';
import { shallow } from 'enzyme';
import AddCustomCollectible from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialRootState from '../../../util/test/initial-root-state';

const mockStore = configureMockStore();

const store = mockStore(initialRootState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation(() => ''),
}));

describe('AddCustomCollectible', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AddCustomCollectible />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
