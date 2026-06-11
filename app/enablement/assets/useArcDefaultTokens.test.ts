import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useArcDefaultTokensEffect } from './useArcDefaultTokens';
import { NETWORKS_CHAIN_ID } from '../../constants/network';
import Engine from '../../core/Engine';
import { selectIsAssetsUnifyStateEnabled } from '../../selectors/featureFlagController/assetsUnifyState';
import { selectEvmNetworkConfigurationsByChainId } from '../../selectors/networkController';
import { selectInternalEvmAccounts } from '../../selectors/accountsController';
import { getCustomAssets } from '../../selectors/assets/assets-controller';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../core/Engine', () => ({
  context: {
    AssetsController: {
      addCustomAsset: jest.fn(),
    },
  },
}));

const ARC_USDC_ASSET_ID =
  'eip155:5042/erc20:0x3600000000000000000000000000000000000000';

const EVM_ACCOUNT = { id: 'account-1', type: 'eip155:eoa' };

describe('useArcDefaultTokens', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const addCustomAssetMock = jest.mocked(
    Engine.context.AssetsController.addCustomAsset,
  );

  function mockSelectors({
    isEnabled = true,
    arcPresent = true,
    accounts = [EVM_ACCOUNT],
    customAssets = {},
  }: {
    isEnabled?: boolean;
    arcPresent?: boolean;
    accounts?: { id: string; type: string }[];
    customAssets?: Record<string, string[]>;
  } = {}) {
    useSelectorMock.mockImplementation((selector: unknown) => {
      if (selector === selectIsAssetsUnifyStateEnabled) {
        return isEnabled;
      }
      if (selector === selectEvmNetworkConfigurationsByChainId) {
        return arcPresent ? { [NETWORKS_CHAIN_ID.ARC]: {} } : {};
      }
      if (selector === selectInternalEvmAccounts) {
        return accounts;
      }
      if (selector === getCustomAssets) {
        return customAssets;
      }
      return undefined;
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    addCustomAssetMock.mockResolvedValue(undefined);
  });

  it('adds USDC for an EVM account that does not have it when Arc is present', () => {
    mockSelectors();

    renderHook(() => useArcDefaultTokensEffect());

    expect(addCustomAssetMock).toHaveBeenCalledWith(
      EVM_ACCOUNT.id,
      ARC_USDC_ASSET_ID,
      expect.objectContaining({
        symbol: 'USDC',
        name: 'USDC',
        decimals: 6,
        chainId: NETWORKS_CHAIN_ID.ARC,
      }),
    );
  });

  it('does nothing when the unified assets state is disabled', () => {
    mockSelectors({ isEnabled: false });

    renderHook(() => useArcDefaultTokensEffect());

    expect(addCustomAssetMock).not.toHaveBeenCalled();
  });

  it('does nothing when the Arc network is not present', () => {
    mockSelectors({ arcPresent: false });

    renderHook(() => useArcDefaultTokensEffect());

    expect(addCustomAssetMock).not.toHaveBeenCalled();
  });

  it('does not re-add USDC when the account already has it', () => {
    mockSelectors({
      customAssets: { [EVM_ACCOUNT.id]: [ARC_USDC_ASSET_ID] },
    });

    renderHook(() => useArcDefaultTokensEffect());

    expect(addCustomAssetMock).not.toHaveBeenCalled();
  });

  it('only dispatches once per account across re-renders', () => {
    mockSelectors();

    const { rerender } = renderHook(() => useArcDefaultTokensEffect());
    rerender({});

    expect(addCustomAssetMock).toHaveBeenCalledTimes(1);
  });
});
