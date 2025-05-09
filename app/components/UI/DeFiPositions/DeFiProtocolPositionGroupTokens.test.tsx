import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DeFiProtocolPositionGroupTokens from './DeFiProtocolPositionGroupTokens';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

const mockTokens = [
  {
    name: 'Token 1',
    symbol: 'TKN1',
    iconUrl: 'https://example.com/tkn1.png',
    balance: 500,
    marketValue: 50,
  },
  {
    name: 'Token 2',
    symbol: 'TKN2',
    iconUrl: 'https://example.com/tkn2.png',
    balance: 20,
    marketValue: 2,
  },
];

describe('DeFiProtocolPositionGroupTokens', () => {
  it('does not render if there are no tokens', () => {
    const { toJSON } = renderWithProvider(
      <DeFiProtocolPositionGroupTokens
        positionType="supply"
        tokens={[]}
        networkIconAvatar={10}
        privacyMode={false}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders the group header, tokens, and balances', async () => {
    const { findByText } = renderWithProvider(
      <DeFiProtocolPositionGroupTokens
        positionType="supply"
        tokens={mockTokens}
        networkIconAvatar={10}
        privacyMode={false}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(await findByText('Supplied')).toBeOnTheScreen();
    expect(await findByText('TKN1')).toBeOnTheScreen();
    expect(await findByText('$50.00')).toBeOnTheScreen();
    expect(await findByText('500 TKN1')).toBeOnTheScreen();
    expect(await findByText('TKN2')).toBeOnTheScreen();
    expect(await findByText('$2.00')).toBeOnTheScreen();
    expect(await findByText('20 TKN2')).toBeOnTheScreen();
  });

  it('renders the component without balances in privacy mode', async () => {
    const { findByText, queryByText, findAllByText } = renderWithProvider(
      <DeFiProtocolPositionGroupTokens
        positionType="supply"
        tokens={mockTokens}
        networkIconAvatar={10}
        privacyMode
      />,
      {
        state: mockInitialState,
      },
    );

    expect(await findByText('Supplied')).toBeOnTheScreen();
    expect(await findByText('TKN1')).toBeOnTheScreen();
    expect(queryByText('$50.00')).not.toBeOnTheScreen();
    expect(queryByText('500 TKN1')).not.toBeOnTheScreen();
    expect(await findByText('TKN2')).toBeOnTheScreen();
    expect(queryByText('$2.00')).not.toBeOnTheScreen();
    expect(queryByText('20 TKN2')).not.toBeOnTheScreen();
    expect(await findAllByText('•••••••••')).toHaveLength(2);
    expect(await findAllByText('••••••')).toHaveLength(2);
  });
});
