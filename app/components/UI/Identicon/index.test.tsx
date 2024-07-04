import React from 'react';
import { render } from '@testing-library/react-native';
import Identicon from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import useTokenList from '../../../components/hooks/DisplayName/useTokenList';
import { TokenListToken } from '@metamask/assets-controllers';

jest.mock('../../../components/hooks/DisplayName/useTokenList');

describe('Identicon', () => {
  const mockStore = configureMockStore();
  const mockUseTokenList = jest
    .mocked(useTokenList)
    .mockImplementation(() => []);

  it('should render correctly when provided address found in tokenList and iconUrl is available', () => {
    const addressMock = '0x0439e60f02a8900a951603950d8d4527f400c3f1';
    mockUseTokenList.mockImplementation(() => [
      {
        address: addressMock,
        iconUrl: 'https://example.com/icon.png',
      } as TokenListToken,
    ]);

    const initialState = {
      settings: { useBlockieIcon: true },
    };
    const store = mockStore(initialState);

    const { toJSON } = render(
      <Provider store={store}>
        <Identicon address={addressMock} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly when useBlockieIcon is true', () => {
    const initialState = {
      settings: { useBlockieIcon: true },
    };
    const store = mockStore(initialState);

    const { toJSON } = render(
      <Provider store={store}>
        <Identicon />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly when useBlockieIcon is false', () => {
    const initialState = {
      settings: { useBlockieIcon: false },
    };
    const store = mockStore(initialState);

    const { toJSON } = render(
      <Provider store={store}>
        <Identicon />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
