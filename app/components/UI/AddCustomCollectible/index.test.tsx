import React from 'react';
import { shallow } from 'enzyme';
import AddCustomCollectible from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialRootState from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';

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

  it('handles address input changes', () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomCollectible />,
      { state: initialRootState },
    );

    const textfield = getByTestId('input-collectible-address');
    fireEvent.changeText(textfield, '0xtestAddress');
    expect(textfield.props.value).toBe('0xtestAddress');
  });

  it('handles tokenId input changes', () => {
    const { getByTestId } = renderWithProvider(
      <AddCustomCollectible />,
      { state: initialRootState },
    );

    const textfield = getByTestId('input-collectible-identifier');
    fireEvent.changeText(textfield, '55');
    expect(textfield.props.value).toBe('55');
  });
});
