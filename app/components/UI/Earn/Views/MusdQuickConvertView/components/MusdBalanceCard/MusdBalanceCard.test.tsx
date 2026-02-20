import React from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('../../../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-image' })),
}));

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import MusdBalanceCard, { MusdBalanceCardTestIds } from './MusdBalanceCard';
import { MUSD_TOKEN } from '../../../../constants/musd';
import initialRootState from '../../../../../../../util/test/initial-root-state';

describe('MusdBalanceCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders card container', () => {
      const { getByTestId } = renderWithProvider(
        <MusdBalanceCard chainId={CHAIN_IDS.MAINNET} balance="$100.00" />,
        {
          state: initialRootState,
        },
      );

      expect(getByTestId(MusdBalanceCardTestIds.CONTAINER)).toBeOnTheScreen();
      expect(getByTestId(MusdBalanceCardTestIds.TOKEN_ICON)).toBeOnTheScreen();
    });

    it('displays balance from props', () => {
      const formattedBalance = '$1,234.56';
      const { getByText } = renderWithProvider(
        <MusdBalanceCard
          chainId={CHAIN_IDS.LINEA_MAINNET}
          balance={formattedBalance}
        />,
        {
          state: initialRootState,
        },
      );

      expect(getByText(formattedBalance)).toBeOnTheScreen();
    });

    it('displays mUSD symbol', () => {
      const { getByText } = renderWithProvider(
        <MusdBalanceCard chainId={CHAIN_IDS.MAINNET} balance="$100.00" />,
        {
          state: initialRootState,
        },
      );

      expect(getByText(MUSD_TOKEN.symbol)).toBeOnTheScreen();
    });

    it('displays percentage boost text from localization', () => {
      const { getByText } = renderWithProvider(
        <MusdBalanceCard chainId={CHAIN_IDS.MAINNET} balance="$100.00" />,
        {
          state: initialRootState,
        },
      );

      expect(getByText('3% boost')).toBeOnTheScreen();
    });
  });
});
