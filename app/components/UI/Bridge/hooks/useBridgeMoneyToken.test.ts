/**
 * Unit test: this hook only maps flags, balances, and APY onto a BridgeToken.
 * There is no screen for component-view, and it does not call a controller.
 */
import { FeatureId } from '@metamask/bridge-controller';
import { renderHook } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import useMoneyAccountDepositAssetId from '../../Money/hooks/useMoneyAccountDepositAssetId';
import useMoneyVaultApy from '../../Money/hooks/useMoneyVaultApy';
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import { selectBridgeMoneyEnabled } from '../../../../selectors/bridge/featureFlags';
import { TokenSelectorType } from '../types';
import { useBridgeMoneyAccountBalance } from './useBridgeMoneyAccountBalance';
import { useMoneyToken } from './useBridgeMoneyToken';
import { useSwapsFeatureId } from './useSwapsFeatureId';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state?: unknown) => unknown) => selector(undefined),
}));

jest.mock('../../../../selectors/bridge/featureFlags', () => ({
  selectBridgeMoneyEnabled: jest.fn(),
}));

jest.mock('../../Money/selectors/visibility', () => ({
  selectIsMoneyAccountVisible: jest.fn(),
}));

jest.mock('../../Money/hooks/useMoneyVaultApy', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../Money/hooks/useMoneyAccountDepositAssetId', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('./useBridgeMoneyAccountBalance', () => ({
  useBridgeMoneyAccountBalance: jest.fn(),
}));

jest.mock('./useSwapsFeatureId', () => ({
  useSwapsFeatureId: jest.fn(),
}));

const mockSelectBridgeMoneyEnabled = jest.mocked(selectBridgeMoneyEnabled);
const mockSelectIsMoneyAccountVisible = jest.mocked(
  selectIsMoneyAccountVisible,
);
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);
const mockUseMoneyAccountDepositAssetId = jest.mocked(
  useMoneyAccountDepositAssetId,
);
const mockUseBridgeMoneyAccountBalance = jest.mocked(
  useBridgeMoneyAccountBalance,
);
const mockUseSwapsFeatureId = jest.mocked(useSwapsFeatureId);

const DEPOSIT_ASSET_ID =
  'eip155:143/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA';

const createBalance = (
  overrides: Partial<ReturnType<typeof useBridgeMoneyAccountBalance>> = {},
) =>
  ({
    withdrawableMusd: new BigNumber('4.5'),
    tokenTotal: new BigNumber('10.25'),
    withdrawableFiatFormatted: '$4.50',
    totalFiatFormatted: '$10.25',
    ...overrides,
  }) as ReturnType<typeof useBridgeMoneyAccountBalance>;

describe('useMoneyToken', () => {
  beforeEach(() => {
    mockSelectBridgeMoneyEnabled.mockReturnValue(true);
    mockSelectIsMoneyAccountVisible.mockReturnValue(true);
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: 6.2,
    } as ReturnType<typeof useMoneyVaultApy>);
    mockUseMoneyAccountDepositAssetId.mockReturnValue(DEPOSIT_ASSET_ID);
    mockUseBridgeMoneyAccountBalance.mockReturnValue(createBalance());
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.UNIFIED_SWAP_BRIDGE);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns undefined when money swaps are disabled', () => {
    mockSelectBridgeMoneyEnabled.mockReturnValue(false);

    const { result } = renderHook(() =>
      useMoneyToken({ type: TokenSelectorType.Source }),
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the money account is hidden', () => {
    mockSelectIsMoneyAccountVisible.mockReturnValue(false);

    const { result } = renderHook(() =>
      useMoneyToken({ type: TokenSelectorType.Dest }),
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the feature is not unified swap bridge', () => {
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);

    const { result } = renderHook(() =>
      useMoneyToken({ type: TokenSelectorType.Source }),
    );

    expect(result.current).toBeUndefined();
  });

  it('uses the withdrawable balance for a source token', () => {
    const { result } = renderHook(() =>
      useMoneyToken({ type: TokenSelectorType.Source }),
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
        chainId: 'eip155:143',
        symbol: 'MUSD',
        name: 'MetaMask Money',
        decimals: 6,
        isMoneyToken: true,
        apy: 6.2,
        balance: '4.5',
        balanceFiat: '$4.50',
      }),
    );
  });

  it('uses the total balance for a destination token', () => {
    const { result } = renderHook(() =>
      useMoneyToken({ type: TokenSelectorType.Dest }),
    );

    expect(result.current?.balance).toBe('10.25');
    expect(result.current?.balanceFiat).toBe('$10.25');
  });

  it('keeps a missing vault APY unset', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: undefined,
    } as ReturnType<typeof useMoneyVaultApy>);

    const { result } = renderHook(() =>
      useMoneyToken({ type: TokenSelectorType.Dest }),
    );

    expect(result.current?.apy).toBeUndefined();
  });

  it('leaves the source balance unset when withdrawable mUSD is missing', () => {
    mockUseBridgeMoneyAccountBalance.mockReturnValue(
      createBalance({ withdrawableMusd: undefined }),
    );

    const { result } = renderHook(() =>
      useMoneyToken({ type: TokenSelectorType.Source }),
    );

    expect(result.current?.balance).toBeUndefined();
  });
});
