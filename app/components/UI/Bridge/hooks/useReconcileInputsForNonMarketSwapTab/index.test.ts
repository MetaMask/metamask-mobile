import { renderHook } from '@testing-library/react-native';
import type { CaipChainId } from '@metamask/utils';
import { useDispatch, useSelector } from 'react-redux';
import {
  resetBridgeDestToken,
  resetBridgeTokenInputs,
  setDestToken,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import {
  selectBridgeLimitOrderFeatureFlags,
  selectBridgeRecurringBuyFeatureFlags,
} from '../../../../../selectors/bridge/featureFlags';
import { BridgeTabKey } from '../../Views/BridgeView/BridgeView.constants';
import { createMockToken } from '../../testUtils/fixtures';
import {
  getDefaultTokenPairForChains,
  getNativeSourceToken,
} from '../../utils/tokenUtils';
import { useReconcileInputsForNonMarketSwapTab } from '.';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

const mockUseDispatch = jest.mocked(useDispatch);
const mockUseSelector = jest.mocked(useSelector);

const ETH_TOKEN = createMockToken({
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1',
  symbol: 'ETH',
});
const USDC_TOKEN = createMockToken({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1',
  symbol: 'USDC',
});
const BSC_TOKEN = createMockToken({
  address: '0x55d398326f99059ff775485246999027b3197955',
  chainId: '0x38',
  symbol: 'USDT',
});
const BASE_TOKEN = createMockToken({
  address: '0x88fb150bdc53a65fe94dea0c9ba0a6d4af4a9d7d',
  chainId: '0x2105',
  symbol: 'LINK',
});
const BASE_RWA_TOKEN = createMockToken({
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x2105',
  name: 'Ondo Tokenized Base Asset',
  symbol: 'RWA',
});
const ETH_RWA_TOKEN = createMockToken({
  address: '0x2222222222222222222222222222222222222222',
  chainId: '0x1',
  name: 'Ondo Tokenized Ethereum Asset',
  symbol: 'RWA',
});

let limitEnabledChainIds: CaipChainId[] | undefined;
let recurringEnabledChainIds: CaipChainId[] | undefined;

function renderReconciliationHook(renderedTab: BridgeTabKey) {
  return renderHook(
    ({
      currentTab,
      sourceToken,
      destToken,
    }: {
      currentTab: BridgeTabKey;
      sourceToken: typeof ETH_TOKEN;
      destToken: typeof USDC_TOKEN;
    }) =>
      useReconcileInputsForNonMarketSwapTab({
        renderedTab: currentTab,
        sourceToken,
        destToken,
      }),
    {
      initialProps: {
        currentTab: renderedTab,
        sourceToken: ETH_TOKEN,
        destToken: USDC_TOKEN,
      },
    },
  );
}

function getRequiredDefaultPair(enabledChainIds: CaipChainId[]) {
  const defaultPair = getDefaultTokenPairForChains(enabledChainIds);
  if (!defaultPair?.destToken) {
    throw new Error('Expected a complete default token pair');
  }
  return {
    sourceToken: defaultPair.sourceToken,
    destToken: defaultPair.destToken,
  };
}

describe('useReconcileInputsForNonMarketSwapTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    limitEnabledChainIds = ['eip155:1'];
    recurringEnabledChainIds = ['eip155:1'];
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectBridgeLimitOrderFeatureFlags) {
        return limitEnabledChainIds
          ? { enabledChainIds: limitEnabledChainIds }
          : undefined;
      }
      if (selector === selectBridgeRecurringBuyFeatureFlags) {
        return recurringEnabledChainIds
          ? { enabledChainIds: recurringEnabledChainIds }
          : undefined;
      }
      return undefined;
    });
  });

  it('does nothing on the Market tab', () => {
    renderReconciliationHook(BridgeTabKey.Market);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('preserves a pair supported by the Limit tab', () => {
    renderReconciliationHook(BridgeTabKey.Limit);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('resets inputs and applies the Limit default pair for an unsupported pair', () => {
    const fallbackPair = getRequiredDefaultPair(['eip155:1']);

    renderHook(() =>
      useReconcileInputsForNonMarketSwapTab({
        renderedTab: BridgeTabKey.Limit,
        sourceToken: BSC_TOKEN,
        destToken: USDC_TOKEN,
      }),
    );

    expect(mockDispatch).toHaveBeenNthCalledWith(1, resetBridgeTokenInputs());
    expect(mockDispatch).toHaveBeenNthCalledWith(2, resetBridgeDestToken());
    expect(mockDispatch).toHaveBeenNthCalledWith(
      3,
      setSourceToken(fallbackPair.sourceToken),
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      4,
      setDestToken(fallbackPair.destToken),
    );
  });

  it('preserves the source token, clears the amount, and uses its network default destination for a cross-chain pair', () => {
    limitEnabledChainIds = ['eip155:1', 'eip155:8453'];
    const fallbackPair = getRequiredDefaultPair(['eip155:8453']);

    renderHook(() =>
      useReconcileInputsForNonMarketSwapTab({
        renderedTab: BridgeTabKey.Limit,
        sourceToken: BASE_TOKEN,
        destToken: USDC_TOKEN,
      }),
    );

    expect(mockDispatch).toHaveBeenNthCalledWith(1, resetBridgeTokenInputs());
    expect(mockDispatch).toHaveBeenNthCalledWith(2, resetBridgeDestToken());
    expect(mockDispatch).toHaveBeenNthCalledWith(
      3,
      setDestToken(fallbackPair.destToken),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setSourceToken(fallbackPair.sourceToken),
    );
  });

  it('uses the native destination when the preserved source is the default destination', () => {
    const fallbackPair = getRequiredDefaultPair(['eip155:1']);

    renderHook(() =>
      useReconcileInputsForNonMarketSwapTab({
        renderedTab: BridgeTabKey.Limit,
        sourceToken: fallbackPair.destToken,
        destToken: BSC_TOKEN,
      }),
    );

    expect(mockDispatch).toHaveBeenNthCalledWith(1, resetBridgeTokenInputs());
    expect(mockDispatch).toHaveBeenNthCalledWith(2, resetBridgeDestToken());
    expect(mockDispatch).toHaveBeenNthCalledWith(
      3,
      setDestToken(getNativeSourceToken('eip155:1')),
    );
    expect(mockDispatch).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['same-chain', BASE_RWA_TOKEN],
    ['cross-chain', ETH_RWA_TOKEN],
  ])(
    'preserves the source and uses its default destination for an unsupported %s destination',
    (_caseName, unsupportedDestToken) => {
      limitEnabledChainIds = ['eip155:1', 'eip155:8453'];
      const fallbackPair = getRequiredDefaultPair(['eip155:8453']);

      renderHook(() =>
        useReconcileInputsForNonMarketSwapTab({
          renderedTab: BridgeTabKey.Limit,
          sourceToken: BASE_TOKEN,
          destToken: unsupportedDestToken,
        }),
      );

      expect(mockDispatch).toHaveBeenNthCalledWith(1, resetBridgeTokenInputs());
      expect(mockDispatch).toHaveBeenNthCalledWith(2, resetBridgeDestToken());
      expect(mockDispatch).toHaveBeenNthCalledWith(
        3,
        setDestToken(fallbackPair.destToken),
      );
    },
  );

  it('uses the default source and preserves a supported same-chain destination', () => {
    limitEnabledChainIds = ['eip155:1', 'eip155:8453'];
    const fallbackPair = getRequiredDefaultPair(['eip155:8453']);

    renderHook(() =>
      useReconcileInputsForNonMarketSwapTab({
        renderedTab: BridgeTabKey.Limit,
        sourceToken: BASE_RWA_TOKEN,
        destToken: BASE_TOKEN,
      }),
    );

    expect(mockDispatch).toHaveBeenNthCalledWith(1, resetBridgeTokenInputs());
    expect(mockDispatch).toHaveBeenNthCalledWith(2, resetBridgeDestToken());
    expect(mockDispatch).toHaveBeenNthCalledWith(
      3,
      setSourceToken(fallbackPair.sourceToken),
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(4, setDestToken(BASE_TOKEN));
  });

  it('uses the full source-network default pair when the source is unsupported and the destination is cross-chain', () => {
    limitEnabledChainIds = ['eip155:1', 'eip155:8453'];
    const fallbackPair = getRequiredDefaultPair(['eip155:8453']);

    renderHook(() =>
      useReconcileInputsForNonMarketSwapTab({
        renderedTab: BridgeTabKey.Limit,
        sourceToken: BASE_RWA_TOKEN,
        destToken: USDC_TOKEN,
      }),
    );

    expect(mockDispatch).toHaveBeenNthCalledWith(1, resetBridgeTokenInputs());
    expect(mockDispatch).toHaveBeenNthCalledWith(2, resetBridgeDestToken());
    expect(mockDispatch).toHaveBeenNthCalledWith(
      3,
      setSourceToken(fallbackPair.sourceToken),
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      4,
      setDestToken(fallbackPair.destToken),
    );
  });

  it('uses the Recurring tab enabled chains for its fallback pair', () => {
    recurringEnabledChainIds = ['eip155:56'];
    const fallbackPair = getRequiredDefaultPair(['eip155:56']);

    renderReconciliationHook(BridgeTabKey.Recurring);

    expect(mockDispatch).toHaveBeenNthCalledWith(
      3,
      setSourceToken(fallbackPair.sourceToken),
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      4,
      setDestToken(fallbackPair.destToken),
    );
  });

  it('waits for the target tab feature flags before reconciling', () => {
    limitEnabledChainIds = undefined;
    const { rerender } = renderReconciliationHook(BridgeTabKey.Limit);

    expect(mockDispatch).not.toHaveBeenCalled();

    limitEnabledChainIds = ['eip155:56'];
    rerender({
      currentTab: BridgeTabKey.Limit,
      sourceToken: ETH_TOKEN,
      destToken: USDC_TOKEN,
    });

    expect(mockDispatch).toHaveBeenCalledTimes(4);
  });

  it('does not override token changes after reconciling the active tab', () => {
    const { rerender } = renderReconciliationHook(BridgeTabKey.Limit);

    rerender({
      currentTab: BridgeTabKey.Limit,
      sourceToken: BSC_TOKEN,
      destToken: USDC_TOKEN,
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
