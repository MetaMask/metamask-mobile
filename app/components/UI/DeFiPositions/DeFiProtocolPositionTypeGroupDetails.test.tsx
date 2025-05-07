import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DeFiProtocolPositionTypeGroupDetails from './DeFiProtocolPositionTypeGroupDetails';
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

describe('DeFiProtocolPositionTypeGroupDetails', () => {
  it('does not render if there are no tokens', () => {
    const { toJSON } = renderWithProvider(
      <DeFiProtocolPositionTypeGroupDetails
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
      <DeFiProtocolPositionTypeGroupDetails
        positionType="supply"
        tokens={mockTokens}
        networkIconAvatar={10}
        privacyMode={false}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(await findByText('Supplied')).toBeDefined();
    expect(await findByText('TKN1')).toBeDefined();
    expect(await findByText('$50.00')).toBeDefined();
    expect(await findByText('500 TKN1')).toBeDefined();
    expect(await findByText('TKN2')).toBeDefined();
    expect(await findByText('$2.00')).toBeDefined();
    expect(await findByText('20 TKN2')).toBeDefined();
  });

  it('renders the component without balances in privacy mode', async () => {
    const { findByText, findAllByText } = renderWithProvider(
      <DeFiProtocolPositionTypeGroupDetails
        positionType="supply"
        tokens={mockTokens}
        networkIconAvatar={10}
        privacyMode
      />,
      {
        state: mockInitialState,
      },
    );

    expect(await findByText('Supplied')).toBeDefined();
    expect(await findByText('TKN1')).toBeDefined();
    expect(await findByText('TKN2')).toBeDefined();
    expect(await findAllByText('•••••••••')).toHaveLength(2);
    expect(await findAllByText('••••••')).toHaveLength(2);
  });
});
