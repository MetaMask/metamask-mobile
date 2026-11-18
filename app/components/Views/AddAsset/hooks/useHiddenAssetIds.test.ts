import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import type { CaipAssetType } from '@metamask/utils';
import { useHiddenAssetIds } from './useHiddenAssetIds';

const SOLANA_ASSET =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:3iQL8BFS2vE7mww4ehAqQHAsbmRNCrPxizWAT2Zfyr9y' as CaipAssetType;
const mockAccountByScope = jest.fn();
const mockIgnoredAssets = jest.fn(() => ({}));

jest.mock('../../../../selectors/multichain/multichain', () => ({
  ...jest.requireActual('../../../../selectors/multichain/multichain'),
  selectMultichainAssetsAllIgnoredAssets: () => mockIgnoredAssets(),
}));
jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: () => mockAccountByScope,
}));

const EVM_ASSET =
  'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678' as CaipAssetType;
const VISIBLE_ASSET =
  'eip155:1/erc20:0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as CaipAssetType;

const stateWithPreferences = (
  assetPreferences: Partial<Record<CaipAssetType, { hidden?: boolean }>>,
) => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      AssetsController: {
        ...backgroundState.AssetsController,
        assetPreferences,
      },
    },
  },
});

describe('useHiddenAssetIds', () => {
  beforeEach(() => {
    mockIgnoredAssets.mockReturnValue({});
    mockAccountByScope.mockReturnValue(undefined);
  });

  it('returns an empty list when nothing is hidden', () => {
    const { result } = renderHookWithProvider(() => useHiddenAssetIds(), {
      state: stateWithPreferences({}),
    });

    expect(result.current).toEqual([]);
  });

  it('returns only assets whose preference is hidden', () => {
    const { result } = renderHookWithProvider(() => useHiddenAssetIds(), {
      state: stateWithPreferences({
        [EVM_ASSET]: { hidden: true },
        [VISIBLE_ASSET]: { hidden: false },
      }),
    });

    expect(result.current).toEqual([EVM_ASSET]);
  });

  describe('non-EVM ignored assets', () => {
    beforeEach(() => {
      mockIgnoredAssets.mockReturnValue({ 'sol-account': [SOLANA_ASSET] });
    });

    it('includes ignored assets owned by the selected account for the chain', () => {
      mockAccountByScope.mockReturnValue({ id: 'sol-account' });
      const { result } = renderHookWithProvider(() => useHiddenAssetIds(), {
        state: stateWithPreferences({}),
      });

      expect(result.current).toEqual([SOLANA_ASSET]);
    });

    it('ignores assets that belong to another account', () => {
      mockAccountByScope.mockReturnValue({ id: 'other-account' });
      const { result } = renderHookWithProvider(() => useHiddenAssetIds(), {
        state: stateWithPreferences({}),
      });

      expect(result.current).toEqual([]);
    });
  });
});
