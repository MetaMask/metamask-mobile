import type { QrSyncImportSummaryPayload } from '../types';

/** Shared extension-picker import summary used by QrSync unit tests. */
export const qrSyncImportSummaryFixture: QrSyncImportSummaryPayload = {
  wallets: [
    {
      id: 'demo-wallet-1',
      name: 'Wallet 1',
      accounts: [
        { id: 'demo-wallet-1/0', name: 'Account 1' },
        { id: 'demo-wallet-1/1', name: 'Account 2' },
      ],
    },
    {
      id: 'demo-wallet-2',
      name: 'Wallet 2',
      accounts: [{ id: 'demo-wallet-2/0', name: 'Account 3' }],
    },
  ],
};
