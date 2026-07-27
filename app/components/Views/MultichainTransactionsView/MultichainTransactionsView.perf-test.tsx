import React from 'react';
import { Provider } from 'react-redux';
import {
  SolScope,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import { measureRenders } from 'reassure';
import configureStore from '../../../util/test/configureStore';
import initialRootState from '../../../util/test/initial-root-state';
import { mockTheme, ThemeContext } from '../../../util/theme';
import MultichainTransactionsView from './MultichainTransactionsView';

const mockNavigation = {
  navigate: jest.fn(),
};
const nativeAsset = {
  amount: '1',
  unit: 'SOL',
  fungible: true,
  type: `${SolScope.Mainnet}/slip44:501`,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(),
  }),
}));

jest.mock(
  '../../hooks/useMultichainActivityMaliciousTokenKeys/useMultichainActivityMaliciousTokenKeys',
  () => ({
    useMultichainActivityMaliciousTokenKeys: () => ({
      maliciousTokenKeys: new Set(),
    }),
  }),
);

const transactions: Transaction[] = Array.from(
  { length: 100 },
  (_value, index) => ({
    id: `solana-transaction-${index}`,
    chain: SolScope.Mainnet,
    account: 'selected-address',
    from: [{ address: `sender-${index}`, asset: nativeAsset }],
    to: [{ address: `recipient-${index}`, asset: nativeAsset }],
    events: [],
    fees: [],
    value: String(index + 1),
    type: index % 2 === 0 ? TransactionType.Send : TransactionType.Receive,
    status: TransactionStatus.Confirmed,
    timestamp: 1_750_000_000 - index,
  }),
);

const store = configureStore(initialRootState);
const ProvidersWrapper = ({ children }: { children: React.ReactElement }) => (
  <Provider store={store}>
    <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
  </Provider>
);

test('MultichainTransactionsView mount performance with 100 transactions', async () => {
  await measureRenders(
    <MultichainTransactionsView
      transactions={transactions}
      selectedAddress="selected-address"
      chainId={SolScope.Mainnet}
    />,
    { wrapper: ProvidersWrapper },
  );
});
