import React from 'react';
import Balance from '.';
import { render } from '@testing-library/react-native';
import { selectNetworkName } from '../../../../selectors/networkInfos';
import { selectChainId } from '../../../../selectors/networkController';
// eslint-disable-next-line import/no-namespace
import * as reactRedux from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockDAI = {
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  aggregators: ['Metamask', 'Coinmarketcap'],
  balanceError: null,
  balance: '6.49757',
  balanceFiat: '$6.49',
  decimals: 18,
  image:
    'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  name: 'Dai Stablecoin',
  symbol: 'DAI',
  isETH: false,
  logo: 'image-path',
};

describe('Balance', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });
  it('should render correctly with a fiat balance', () => {
    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockImplementation((selector) => {
      switch (selector) {
        case selectNetworkName:
          return {};
        case selectChainId:
          return '1';
      }
    });
    const wrapper = render(
      <Balance asset={mockDAI} mainBalance="123" secondaryBalance="456" />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly without a fiat balance', () => {
    const wrapper = render(
      <Balance
        asset={mockDAI}
        mainBalance="123"
        secondaryBalance={undefined}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
