import { act, renderHook, waitFor } from '@testing-library/react-native';
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
    TokensController: {
      addToken: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'arc-network-client'),
    },
  },
}));

const ARC_USDC_TOKEN_ADDRESS = '0x3600000000000000000000000000000000000000';

const ARC_USDC_ASSET_ID = `eip155:5042/erc20:${ARC_USDC_TOKEN_ADDRESS}`;

const EVM_ACCOUNT = {
  id: 'account-1',
  type: 'eip155:eoa',
  address: '0xabc',
};

describe('useArcDefaultTokens', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const addCustomAssetMock = jest.mocked(
    Engine.context.AssetsController.addCustomAsset,
  );
  const addTokenMock = jest.mocked(Engine.context.TokensController.addToken);

  function mockSelectors({
    isEnabled = true,
    arcPresent = true,
    accounts = [EVM_ACCOUNT],
    customAssets = {},
  }: {
    isEnabled?: boolean;
    arcPresent?: boolean;
    accounts?: { id: string; type: string; address: string }[];
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
    addTokenMock.mockResolvedValue([]);
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

  it('adds USDC to the legacy TokensController for the account', () => {
    mockSelectors();

    renderHook(() => useArcDefaultTokensEffect());

    expect(addTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        address: ARC_USDC_TOKEN_ADDRESS,
        symbol: 'USDC',
        name: 'USDC',
        decimals: 6,
        networkClientId: 'arc-network-client',
        interactingAddress: EVM_ACCOUNT.address,
      }),
    );
  });

  it('still adds to the legacy TokensController when the unified assets state is disabled', () => {
    mockSelectors({ isEnabled: false });

    renderHook(() => useArcDefaultTokensEffect());

    expect(addTokenMock).toHaveBeenCalledTimes(1);
    expect(addCustomAssetMock).not.toHaveBeenCalled();
  });

  it('does nothing when the Arc network is not present', () => {
    mockSelectors({ arcPresent: false });

    renderHook(() => useArcDefaultTokensEffect());

    expect(addTokenMock).not.toHaveBeenCalled();
    expect(addCustomAssetMock).not.toHaveBeenCalled();
  });

  it('does not re-add the custom asset when the account already has it', () => {
    mockSelectors({
      customAssets: { [EVM_ACCOUNT.id]: [ARC_USDC_ASSET_ID] },
    });

    renderHook(() => useArcDefaultTokensEffect());

    expect(addCustomAssetMock).not.toHaveBeenCalled();
    // The legacy controller still gets the token.
    expect(addTokenMock).toHaveBeenCalledTimes(1);
  });

  it('only dispatches once per account across re-renders', () => {
    mockSelectors();

    const { rerender } = renderHook(() => useArcDefaultTokensEffect());
    rerender({});

    expect(addCustomAssetMock).toHaveBeenCalledTimes(1);
    expect(addTokenMock).toHaveBeenCalledTimes(1);
  });

  it('retries adding Arc custom asset after a failure', async () => {
    mockSelectors();
    addCustomAssetMock
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(undefined);

    const { rerender } = renderHook(() => useArcDefaultTokensEffect());

    await waitFor(() => {
      expect(addCustomAssetMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await Promise.resolve();
    });

    rerender({});

    await waitFor(() => {
      expect(addCustomAssetMock).toHaveBeenCalledTimes(2);
    });
  });
});
