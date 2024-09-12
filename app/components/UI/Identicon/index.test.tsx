import React from 'react';
import { shallow } from 'enzyme';
import { render } from '@testing-library/react-native';
import Identicon from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import useTokenList from '../../../components/hooks/DisplayName/useTokenList';

jest.mock('../../../components/hooks/DisplayName/useTokenList');

describe('Identicon', () => {
  const mockStore = configureMockStore();
  const mockUseTokenList = jest.mocked(useTokenList).mockImplementation(() => [
    {
      name: 'test',
      symbol: 'test',
      decimals: 123,
      address: '0x123',
      occurrences: 1,
      aggregators: ['test'],
      iconUrl: 'https://test',
    },
  ]);

  it('should render correctly when provided address found in tokenList and iconUrl is available', () => {
    const addressMock = '0x0439e60f02a8900a951603950d8d4527f400c3f1';
    mockUseTokenList.mockImplementation(() => [
      {
        name: 'test',
        symbol: 'test',
        decimals: 123,
        address: addressMock,
        iconUrl: 'https://example.com/icon.png',
        occurrences: 1,
        aggregators: ['test'],
      },
    ]);

    const initialState = {
      settings: { useBlockieIcon: true },
    };
    const store = mockStore(initialState);

    const wrapper = render(
      <Provider store={store}>
        <Identicon address={addressMock} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render correctly when useBlockieIcon is true', () => {
    const initialState = {
      settings: { useBlockieIcon: true },
    };
    const store = mockStore(initialState);

    const wrapper = shallow(
      <Provider store={store}>
        <Identicon />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render correctly when useBlockieIcon is false', () => {
    const initialState = {
      settings: { useBlockieIcon: false },
    };
    const store = mockStore(initialState);

    const wrapper = shallow(
      <Provider store={store}>
        <Identicon />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
