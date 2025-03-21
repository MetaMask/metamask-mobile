import React from 'react';
import { shallow } from 'enzyme';
import { render, fireEvent } from '@testing-library/react-native';
import AssetElement from './';
import { getAssetTestId } from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import { BALANCE_TEST_ID, SECONDARY_BALANCE_TEST_ID } from './index.constants';
import { TOKEN_BALANCE_LOADING } from '../Tokens/constants';

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
    hasBalanceError: false,
    decimals: 0,
    image: '',
  };

  it('should render correctly', () => {
    const wrapper = shallow(<AssetElement asset={erc20Token} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders the main balance if provided', () => {
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

  it('renders the main and secondary balance', () => {
    const { getByTestId } = render(
      <AssetElement
        balance={erc20Token.balance}
        secondaryBalance={erc20Token.balance}
        asset={erc20Token}
      />,
    );

    expect(getByTestId(BALANCE_TEST_ID)).toBeDefined();
    expect(getByTestId(SECONDARY_BALANCE_TEST_ID)).toBeDefined();
  });

  it('renders the main and secondary balance with privacy mode', () => {
    const { getByTestId } = render(
      <AssetElement
        asset={erc20Token}
        balance={erc20Token.balance}
        secondaryBalance={erc20Token.balance}
        privacyMode
      />,
    );

    const mainBalance = getByTestId(BALANCE_TEST_ID);
    const secondaryBalance = getByTestId(SECONDARY_BALANCE_TEST_ID);

    expect(mainBalance.props.children).toBe('•••••••••');
    expect(secondaryBalance.props.children).toBe('••••••');
  });

  it('renders skeleton when balance is loading', () => {
    const { getByTestId } = render(
      <AssetElement
        asset={erc20Token}
        balance={TOKEN_BALANCE_LOADING}
        secondaryBalance={TOKEN_BALANCE_LOADING}
      />,
    );

    expect(getByTestId(BALANCE_TEST_ID).props.children.type.name).toBe(
      'SkeletonText',
    );
    expect(
      getByTestId(SECONDARY_BALANCE_TEST_ID).props.children.type.name,
    ).toBe('SkeletonText');
  });
});
