import React from 'react';
import NotificationsDetails from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { TRIGGER_TYPES } from '../../../../util/notifications';

const mockRoute = {
  params: {
    notification: {
      type: TRIGGER_TYPES.LIDO_STAKE_COMPLETED,
      block_number: 18487118,
      block_timestamp: '1698961091',
      chain_id: 1,
      created_at: '2023-11-02T22:28:49.970865Z',
      data: {
        kind: 'lido_stake_completed',
        stake_in: {
          usd: '1806.33',
          name: 'Ethereum',
          image:
            'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/stETH.svg',
          amount: '330303634023928032',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          decimals: '18',
        },
        stake_out: {
          usd: '1801.30',
          name: 'Liquid staked Ether 2.0',
          image:
            'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/stETH.svg',
          amount: '330303634023928032',
          symbol: 'STETH',
          address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
          decimals: '18',
        },
        network_fee: {
          gas_price: '26536359866',
          native_token_price_in_usd: '1806.33',
        },
      },
      id: '9d9b1467-b3ee-5492-8ca2-22382657b690',
      trigger_id: 'ec10d66a-f78f-461f-83c9-609aada8cc50',
      tx_hash:
        '0x8cc0fa805f7c3b1743b14f3b91c6b824113b094f26d4ccaf6a71ad8547ce6a0f',
      unread: true,
      createdAt: new Date(),
      isRead: false,
    },
  },
};

describe('NotificationsDetails', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsDetails route={mockRoute as any} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
