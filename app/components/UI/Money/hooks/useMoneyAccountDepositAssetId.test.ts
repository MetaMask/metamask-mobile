import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../../Earn/constants/musd';
import { useMoneyAccountDepositAssetId } from './useMoneyAccountDepositAssetId';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyAccountVaultConfig: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;

// Resolve `useSelector(selector)` calls by running the selector against a
// vault-config-only slice, so only the vault config drives the hook.
const withVaultConfig = (vaultConfig: { chainId?: Hex } | undefined) => {
  (selectMoneyAccountVaultConfig as unknown as jest.Mock).mockReturnValue(
    vaultConfig,
  );
  mockUseSelector.mockImplementation((selector) => selector());
};

describe('useMoneyAccountDepositAssetId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the asset id for the vault chain', () => {
    withVaultConfig({ chainId: CHAIN_IDS.MAINNET });

    const { result } = renderHook(() => useMoneyAccountDepositAssetId());

    expect(result.current).toBe(
      MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MAINNET],
    );
  });

  it('falls back to the Monad asset id when there is no vault config', () => {
    withVaultConfig(undefined);

    const { result } = renderHook(() => useMoneyAccountDepositAssetId());

    expect(result.current).toBe(MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD]);
  });
});
