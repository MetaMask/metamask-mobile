import type { RootState } from '../../reducers';
import { selectSelectedAccountWalletId } from './selectedWallet';

const createState = (selectedAccountGroup?: string): RootState =>
  ({
    engine: {
      backgroundState: {
        AccountTreeController: { selectedAccountGroup },
      },
    },
  }) as unknown as RootState;

describe('selectSelectedAccountWalletId', () => {
  it('returns the wallet ID shared by the selected account group', () => {
    expect(
      selectSelectedAccountWalletId(createState('entropy:wallet-1/ethereum')),
    ).toBe('entropy:wallet-1');
  });

  it('returns null when no account group is selected', () => {
    expect(selectSelectedAccountWalletId(createState())).toBeNull();
  });
});
