import Routes from '../../../../constants/navigation/Routes';
import { FillType, type PerpsTransaction } from '../types/transactionHistory';
import { navigateToPerpsTransactionDetails } from './navigateToPerpsTransactionDetails';

const createNavigation = () => ({ navigate: jest.fn() });

const tradeTransaction: PerpsTransaction = {
  id: 'order-1',
  type: 'trade',
  category: 'position_close',
  title: 'Closed short',
  subtitle: '0.00016 BTC',
  timestamp: 1698700000000,
  asset: 'BTC',
  fill: {
    shortTitle: 'Closed short',
    amount: '-$0.02',
    amountNumber: -0.02,
    isPositive: false,
    size: '0.00016',
    entryPrice: '63479',
    pnl: '-0.02',
    fee: '0.01',
    points: '0',
    feeToken: 'USDC',
    action: 'Closed',
    fillType: FillType.Standard,
  },
};

const depositTransaction: PerpsTransaction = {
  id: 'deposit-1',
  type: 'deposit',
  category: 'deposit',
  title: 'Deposit',
  subtitle: 'USDC',
  timestamp: 1698700000000,
  asset: 'USDC',
  depositWithdrawal: {
    amount: '+$500',
    amountNumber: 500,
    isPositive: true,
    asset: 'USDC',
    txHash: '0xdeadbeef',
    status: 'completed',
    type: 'deposit',
  },
};

describe('navigateToPerpsTransactionDetails', () => {
  it('opens Activity details for a mapped historic fill when redesign is enabled', () => {
    const navigation = createNavigation();

    navigateToPerpsTransactionDetails(navigation, tradeTransaction, false);

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ACTIVITY_DETAILS,
      expect.objectContaining({
        chainId: 'eip155:42161',
        txIdentifier: 'order-1',
        preloadKey: expect.any(String),
      }),
    );
  });

  it('tags testnet deposits with Arbitrum Sepolia', () => {
    const navigation = createNavigation();

    navigateToPerpsTransactionDetails(navigation, depositTransaction, true);

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ACTIVITY_DETAILS,
      expect.objectContaining({
        chainId: 'eip155:421614',
        txIdentifier: '0xdeadbeef',
      }),
    );
  });

  it('falls back to the legacy position screen when a trade cannot be mapped', () => {
    const navigation = createNavigation();
    const fill = tradeTransaction.fill;
    if (!fill) {
      throw new Error('expected fill on tradeTransaction');
    }
    const unmappedTrade: PerpsTransaction = {
      ...tradeTransaction,
      fill: {
        ...fill,
        shortTitle: 'Unknown fill',
      },
    };

    navigateToPerpsTransactionDetails(navigation, unmappedTrade, false);

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.PERPS.POSITION_TRANSACTION,
      { transaction: unmappedTrade },
    );
  });

  it('falls back to the legacy order screen when an order cannot be mapped', () => {
    const navigation = createNavigation();
    const unmappedOrder: PerpsTransaction = {
      id: 'order-open-1',
      type: 'order',
      category: 'limit_order',
      title: 'Limit long',
      subtitle: '1 ETH',
      timestamp: 1698700000000,
      asset: 'ETH',
    };

    navigateToPerpsTransactionDetails(navigation, unmappedOrder, false);

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.PERPS.ORDER_TRANSACTION,
      { transaction: unmappedOrder },
    );
  });

  it('falls back to the legacy funding screen when funding cannot be mapped', () => {
    const navigation = createNavigation();
    const unmappedFunding: PerpsTransaction = {
      id: 'funding-1',
      type: 'funding',
      category: 'funding_fee',
      title: 'Funding fee',
      subtitle: 'ETH',
      timestamp: 1698700000000,
      asset: 'ETH',
    };

    navigateToPerpsTransactionDetails(navigation, unmappedFunding, false);

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.PERPS.FUNDING_TRANSACTION,
      { transaction: unmappedFunding },
    );
  });
});
