import React from 'react';
import { shallow } from 'enzyme';
import { render, fireEvent } from '@testing-library/react-native';
import AssetElement from './';
import { getAssetTestId } from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';

describe('AssetElement', () => {
  const onPressMock = jest.fn();
  const onLongPressMock = jest.fn();

  const erc20Token = {
    name: 'Dai',
    symbol: 'DAI',
    address: '0x123',
    aggregators: [],
    balance: '10',
    balanceFiat: ' $1',
    logo: '',
    isETH: undefined,
    balanceError: null,
    decimals: 0,
    image: '',
  };

  it('should render correctly', () => {
    const wrapper = shallow(<AssetElement asset={erc20Token} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders the asset balance if provided', () => {
    const { getByText } = render(
      <AssetElement asset={erc20Token} balance={erc20Token.balance} />,
    );

    expect(getByText('10')).toBeDefined();
  });

  it('calls onPress with the correct asset when clicked', () => {
    const { getByTestId } = render(
      <AssetElement asset={erc20Token} onPress={onPressMock} />,
    );

    fireEvent.press(getByTestId(getAssetTestId(erc20Token.symbol)));

    expect(onPressMock).toHaveBeenCalledWith(erc20Token);
  });

  it('calls onLongPress with the correct asset when long pressed', () => {
    const { getByTestId } = render(
      <AssetElement asset={erc20Token} onLongPress={onLongPressMock} />,
    );

    fireEvent(getByTestId(getAssetTestId(erc20Token.symbol)), 'onLongPress');

    expect(onLongPressMock).toHaveBeenCalledWith(erc20Token);
  });
});
