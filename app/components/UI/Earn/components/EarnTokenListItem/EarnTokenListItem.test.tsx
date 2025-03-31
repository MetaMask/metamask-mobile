import React from 'react';
import { EarnTokenListItemProps } from './EarnTokenListItem.types';
import EarnTokenListItem from '.';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useSelector } from 'react-redux';
import { selectIsIpfsGatewayEnabled } from '../../../../../selectors/preferencesController';
import {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('EarnTokenListItem', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectIsIpfsGatewayEnabled) return true;
    });
  });

  afterEach(() => {
    (useSelector as jest.Mock).mockClear();
  });

  const baseProps: EarnTokenListItemProps = {
    token: {
      chainId: '0x1',
      image:
        'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      aggregators: [],
      decimals: 18,
      balance: '',
      balanceFiat: '',
      logo: undefined,
      isETH: false,
    },
    primaryText: {
      value: `3.0% ${strings('stake.apr')}`,
      variant: TextVariant.BodyMDBold,
      color: TextColor.Success,
    },
    onPress: jest.fn(),
  };

  const secondaryText = {
    value: '10,100.00 USDC',
    variant: TextVariant.BodySMBold,
    color: TextColor.Alternative,
  };

  it('render matches snapshot', () => {
    const props: EarnTokenListItemProps = {
      ...baseProps,
      secondaryText,
    };

    const { toJSON } = renderWithProvider(<EarnTokenListItem {...props} />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders primary text and secondary text', () => {
    const props: EarnTokenListItemProps = {
      ...baseProps,
      secondaryText,
    };

    const { getByText } = renderWithProvider(<EarnTokenListItem {...props} />);

    expect(getByText('Dai Stablecoin')).toBeDefined();
    expect(getByText('10,100.00 USDC')).toBeDefined();
  });

  it('renders only primary text', () => {
    const { getByText } = renderWithProvider(
      <EarnTokenListItem {...baseProps} />,
    );

    expect(getByText('Dai Stablecoin')).toBeDefined();
  });
});
