import React from 'react';
import { shallow } from 'enzyme';
import { render, fireEvent } from '@testing-library/react-native';
import AssetElement from './';
import { getAssetTestId } from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import {
  BALANCE_TEST_ID,
  SECONDARY_BALANCE_BUTTON_TEST_ID,
  SECONDARY_BALANCE_TEST_ID,
} from './index.constants';
import { TOKEN_BALANCE_LOADING } from '../Tokens/constants';
import { TextColor } from '../../../component-library/components/Texts/Text';
import { mockTheme } from '../../../util/theme';

describe('AssetElement', () => {
  const onPressMock = jest.fn();
  const onLongPressMock = jest.fn();
  const onSecondaryBalancePressMock = jest.fn();

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
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

  it('does not hide secondary balance in privacy mode when hideSecondaryBalanceInPrivacyMode is false', () => {
    const { getByTestId } = render(
      <AssetElement
        asset={erc20Token}
        balance={erc20Token.balance}
        secondaryBalance="+5.67%"
        hideSecondaryBalanceInPrivacyMode={false}
        privacyMode
      />,
    );

    const mainBalance = getByTestId(BALANCE_TEST_ID);
    const secondaryBalance = getByTestId(SECONDARY_BALANCE_TEST_ID);

    expect(mainBalance.props.children).toBe('•••••••••');
    expect(secondaryBalance.props.children).toBe('+5.67%'); // Should not be hidden
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

  it('applies custom color to secondary balance when provided', () => {
    const { getByTestId } = render(
      <AssetElement
        asset={erc20Token}
        balance="10"
        secondaryBalance="+5.50%"
        secondaryBalanceColor={TextColor.Success}
      />,
    );

    const secondaryBalance = getByTestId(SECONDARY_BALANCE_TEST_ID);
    expect(secondaryBalance.props.style).toMatchObject({
      color: mockTheme.colors.success.default,
    });
  });

  it('uses default style when no custom color is provided', () => {
    const { getByTestId } = render(
      <AssetElement
        asset={erc20Token}
        balance="10"
        secondaryBalance="+5.50%"
      />,
    );

    const secondaryBalance = getByTestId(SECONDARY_BALANCE_TEST_ID);
    expect(secondaryBalance.props.style).toMatchObject({
      color: mockTheme.colors.text.alternative,
    });
  });

  it('applies success color for positive percentage', () => {
    const { getByTestId } = render(
      <AssetElement
        asset={erc20Token}
        balance="$100.00"
        secondaryBalance="+8.61%"
        secondaryBalanceColor={TextColor.Success}
      />,
    );

    const secondaryBalance = getByTestId(SECONDARY_BALANCE_TEST_ID);
    expect(secondaryBalance.props.style).toMatchObject({
      color: mockTheme.colors.success.default,
    });
    expect(secondaryBalance.props.children).toBe('+8.61%');
  });

  it('applies error color for negative percentage', () => {
    const { getByTestId } = render(
      <AssetElement
        asset={erc20Token}
        balance="$100.00"
        secondaryBalance="-3.25%"
        secondaryBalanceColor={TextColor.Error}
      />,
    );

    const secondaryBalance = getByTestId(SECONDARY_BALANCE_TEST_ID);
    expect(secondaryBalance.props.style).toMatchObject({
      color: mockTheme.colors.error.default,
    });
    expect(secondaryBalance.props.children).toBe('-3.25%');
  });

  it('applies alternative color for zero percentage', () => {
    const { getByTestId } = render(
      <AssetElement
        asset={erc20Token}
        balance="$100.00"
        secondaryBalance="0.00%"
        secondaryBalanceColor={TextColor.Alternative}
      />,
    );

    const secondaryBalance = getByTestId(SECONDARY_BALANCE_TEST_ID);
    expect(secondaryBalance.props.style).toMatchObject({
      color: mockTheme.colors.text.alternative,
    });
    expect(secondaryBalance.props.children).toBe('0.00%');
  });

  describe('onSecondaryBalancePress', () => {
    it('calls onSecondaryBalancePress with asset when secondary balance is pressed', () => {
      const { getByTestId } = render(
        <AssetElement
          asset={erc20Token}
          balance="$100.00"
          secondaryBalance="Convert to mUSD"
          onSecondaryBalancePress={onSecondaryBalancePressMock}
        />,
      );

      fireEvent.press(getByTestId(SECONDARY_BALANCE_BUTTON_TEST_ID));

      expect(onSecondaryBalancePressMock).toHaveBeenCalledTimes(1);
      expect(onSecondaryBalancePressMock).toHaveBeenCalledWith(erc20Token);
    });

    it('does not call onSecondaryBalancePress when handler is undefined', () => {
      const { getByTestId } = render(
        <AssetElement
          asset={erc20Token}
          balance="$100.00"
          secondaryBalance="+5.67%"
        />,
      );

      fireEvent.press(getByTestId(SECONDARY_BALANCE_BUTTON_TEST_ID));

      expect(onSecondaryBalancePressMock).not.toHaveBeenCalled();
    });

    it('does not call onSecondaryBalancePress when disabled prop is true', () => {
      const { getByTestId } = render(
        <AssetElement
          asset={erc20Token}
          balance="$100.00"
          secondaryBalance="Convert to mUSD"
          onSecondaryBalancePress={onSecondaryBalancePressMock}
          disabled
        />,
      );

      fireEvent.press(getByTestId(SECONDARY_BALANCE_BUTTON_TEST_ID));

      expect(onSecondaryBalancePressMock).not.toHaveBeenCalled();
    });
  });
});
