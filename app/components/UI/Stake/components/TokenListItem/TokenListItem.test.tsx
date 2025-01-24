import React from 'react';
import { TokenListItemProps } from './TokenListItem.types';
import TokenListItem from '.';
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

describe('TokenListItem', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectIsIpfsGatewayEnabled) return true;
    });
  });

  afterEach(() => {
    (useSelector as jest.Mock).mockClear();
  });

  const baseProps: TokenListItemProps = {
    token: {
      chainId: '0x1',
      image:
        'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
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
    const props: TokenListItemProps = {
      ...baseProps,
      secondaryText,
    };

    const { toJSON } = renderWithProvider(<TokenListItem {...props} />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders primary text and secondary text', () => {
    const props: TokenListItemProps = {
      ...baseProps,
      secondaryText,
    };

    const { getByText } = renderWithProvider(<TokenListItem {...props} />);

    expect(getByText('Dai Stablecoin')).toBeDefined();
    expect(getByText('10,100.00 USDC')).toBeDefined();
  });

  it('renders only primary text', () => {
    const { getByText } = renderWithProvider(<TokenListItem {...baseProps} />);

    expect(getByText('Dai Stablecoin')).toBeDefined();
  });
});
