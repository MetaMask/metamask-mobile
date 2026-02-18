import { renderHook, act } from '@testing-library/react-native';
import { useTokenSelection } from './useTokenSelection';
import {
  setSourceToken,
  setDestToken,
  setIsDestTokenManuallySet,
  setSourceAmount,
} from '../../../../core/redux/slices/bridge';
import { createMockToken } from '../testUtils/fixtures';
import { BridgeToken, TokenSelectorType } from '../types';

const mockDispatch = jest.fn();
const mockHandleSwitchTokensInner = jest.fn().mockResolvedValue(undefined);
const mockHandleSwitchTokens = jest.fn(() => mockHandleSwitchTokensInner);
const mockAddNetwork = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('./useSwitchTokens', () => ({
  useSwitchTokens: () => ({ handleSwitchTokens: mockHandleSwitchTokens }),
}));

jest.mock('./useIsNetworkEnabled', () => ({
  useIsNetworkEnabled: jest.fn(() => true),
}));

const mockAutoUpdateDestToken = jest.fn();
jest.mock('./useAutoUpdateDestToken', () => ({
  useAutoUpdateDestToken: () => ({
    autoUpdateDestToken: mockAutoUpdateDestToken,
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        addNetwork: mockAddNetwork,
      },
    },
  },
}));

jest.mock('../../../../util/networks/customNetworks', () => {
  const actual = jest.requireActual('../../../../util/networks/customNetworks');

  return {
    ...actual,
    PopularList: [
      {
        chainId: '0xa',
        nickname: 'OP',
        rpcUrl: 'https://op-mainnet.infura.io/v3/mock',
        failoverRpcUrls: [],
        ticker: 'ETH',
        rpcPrefs: {
          blockExplorerUrl: 'https://optimistic.etherscan.io',
        },
      },
    ],
  };
});

import { useSelector } from 'react-redux';
import { useIsNetworkEnabled } from './useIsNetworkEnabled';
const mockUseSelector = useSelector as jest.Mock;
const mockUseIsNetworkEnabled = useIsNetworkEnabled as jest.Mock;

const mockSourceToken = createMockToken({
  address: '0xsource',
  symbol: 'SRC',
});
const mockDestToken = createMockToken({
  address: '0xdest',
  symbol: 'DST',
  chainId: '0xa',
});
const mockDestAmount = '100';

interface SelectorState {
  sourceToken: BridgeToken | null;
  destToken: BridgeToken | null;
  destAmount: string;
  networkConfigurations: Record<string, unknown> | undefined;
}

const defaultSelectorState: SelectorState = {
  sourceToken: mockSourceToken,
  destToken: mockDestToken,
  destAmount: mockDestAmount,
  networkConfigurations: {
    '0x1': { name: 'Ethereum Mainnet' },
    '0xa': { name: 'OP Mainnet' },
  } as Record<string, unknown>,
};

const renderTokenSelectionHook = (
  type: TokenSelectorType,
  selectorOverrides: Partial<SelectorState> = {},
) => {
  const selectorState = {
    ...defaultSelectorState,
    ...selectorOverrides,
  };

  const selectorValues = [
    selectorState.sourceToken,
    selectorState.destToken,
    selectorState.destAmount,
    selectorState.networkConfigurations,
  ];
  let selectorCallIndex = 0;
  mockUseSelector.mockImplementation(() => {
    const value = selectorValues[selectorCallIndex % selectorValues.length];
    selectorCallIndex += 1;
    return value;
  });

  return renderHook(() => useTokenSelection(type));
};

describe('useTokenSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsNetworkEnabled.mockReturnValue(true);
    mockHandleSwitchTokensInner.mockResolvedValue(undefined);
    mockAddNetwork.mockResolvedValue(undefined);
  });

  describe('source token selection', () => {
    it('dispatches setSourceToken and calls autoUpdateDestToken when selecting new source token', async () => {
      const { result } = renderTokenSelectionHook(TokenSelectorType.Source);
      const newToken = createMockToken({
        address: '0xnewtoken',
        symbol: 'NEW',
      });

      await act(async () => {
        await result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(newToken));
      expect(mockDispatch).toHaveBeenCalledWith(setSourceAmount(undefined));
      expect(mockAutoUpdateDestToken).toHaveBeenCalledWith(newToken);
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('calls handleSwitchTokens when selecting current dest token as source', async () => {
      const { result } = renderTokenSelectionHook(TokenSelectorType.Source);

      await act(async () => {
        await result.current.handleTokenPress(mockDestToken);
      });

      expect(mockHandleSwitchTokens).toHaveBeenCalledWith(mockDestAmount);
      expect(mockHandleSwitchTokensInner).toHaveBeenCalled();
      expect(mockAutoUpdateDestToken).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('returns source token as selectedToken', () => {
      const { result } = renderTokenSelectionHook(TokenSelectorType.Source);

      expect(result.current.selectedToken).toBe(mockSourceToken);
    });

    it('does not swap when dest network is disabled', async () => {
      mockUseIsNetworkEnabled.mockReturnValue(false);

      const { result } = renderTokenSelectionHook(TokenSelectorType.Source);

      await act(async () => {
        await result.current.handleTokenPress(mockDestToken);
      });

      expect(mockHandleSwitchTokens).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('dest token selection', () => {
    it('dispatches setDestToken when selecting new dest token', async () => {
      const { result } = renderTokenSelectionHook(TokenSelectorType.Dest);
      const newToken = createMockToken({
        address: '0xnewdest',
        symbol: 'NEWDST',
      });

      await act(async () => {
        await result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setDestToken(newToken));
      expect(mockDispatch).toHaveBeenCalledWith(
        setIsDestTokenManuallySet(true),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('calls handleSwitchTokens when selecting current source token as dest', async () => {
      const { result } = renderTokenSelectionHook(TokenSelectorType.Dest);

      await act(async () => {
        await result.current.handleTokenPress(mockSourceToken);
      });

      expect(mockHandleSwitchTokens).toHaveBeenCalledWith(mockDestAmount);
      expect(mockHandleSwitchTokensInner).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('returns dest token as selectedToken', () => {
      const { result } = renderTokenSelectionHook(TokenSelectorType.Dest);

      expect(result.current.selectedToken).toBe(mockDestToken);
    });
  });

  describe('network auto-add', () => {
    it('aborts source selection when addNetwork rejects', async () => {
      mockAddNetwork.mockRejectedValueOnce(new Error('addNetwork failed'));
      const { result } = renderTokenSelectionHook(TokenSelectorType.Source, {
        networkConfigurations: {},
      });
      const sourceTokenOnMissingNetwork = createMockToken({
        chainId: '0xa',
      });

      await act(async () => {
        await result.current.handleTokenPress(sourceTokenOnMissingNetwork);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockAutoUpdateDestToken).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('continues dest selection when addNetwork rejects', async () => {
      mockAddNetwork.mockRejectedValueOnce(new Error('addNetwork failed'));
      const { result } = renderTokenSelectionHook(TokenSelectorType.Dest, {
        networkConfigurations: {},
      });
      const destTokenOnMissingNetwork = createMockToken({
        address: '0xdest-new',
        chainId: '0xa',
      });

      await act(async () => {
        await result.current.handleTokenPress(destTokenOnMissingNetwork);
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setDestToken(destTokenOnMissingNetwork),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setIsDestTokenManuallySet(true),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles null source token', async () => {
      const { result } = renderTokenSelectionHook(TokenSelectorType.Source, {
        sourceToken: null,
      });
      const newToken = createMockToken();

      await act(async () => {
        await result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(newToken));
      expect(mockDispatch).toHaveBeenCalledWith(setSourceAmount(undefined));
      expect(mockAutoUpdateDestToken).toHaveBeenCalledWith(newToken);
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('handles null dest token', async () => {
      const { result } = renderTokenSelectionHook(TokenSelectorType.Dest, {
        destToken: null,
      });
      const newToken = createMockToken();

      await act(async () => {
        await result.current.handleTokenPress(newToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setDestToken(newToken));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('does not swap when addresses match but chainIds differ', async () => {
      const { result } = renderTokenSelectionHook(TokenSelectorType.Source);
      const sameAddressToken = createMockToken({
        address: mockDestToken.address,
        chainId: '0x5',
      });

      await act(async () => {
        await result.current.handleTokenPress(sameAddressToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setSourceToken(sameAddressToken),
      );
      expect(mockDispatch).toHaveBeenCalledWith(setSourceAmount(undefined));
      expect(mockAutoUpdateDestToken).toHaveBeenCalledWith(sameAddressToken);
      expect(mockHandleSwitchTokens).not.toHaveBeenCalled();
    });

    it('does not swap when chainIds match but addresses differ', async () => {
      const { result } = renderTokenSelectionHook(TokenSelectorType.Source);
      const sameChainToken = createMockToken({
        address: '0xdifferent',
        chainId: mockDestToken.chainId,
      });

      await act(async () => {
        await result.current.handleTokenPress(sameChainToken);
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSourceToken(sameChainToken));
      expect(mockDispatch).toHaveBeenCalledWith(setSourceAmount(undefined));
      expect(mockAutoUpdateDestToken).toHaveBeenCalledWith(sameChainToken);
      expect(mockHandleSwitchTokens).not.toHaveBeenCalled();
    });

    it('falls back to empty network configurations when selector returns undefined', async () => {
      const { result } = renderTokenSelectionHook(TokenSelectorType.Source, {
        networkConfigurations: undefined as unknown as Record<string, unknown>,
      });
      const tokenOnMissingNetwork = createMockToken({
        chainId: '0x1',
      });

      await act(async () => {
        await result.current.handleTokenPress(tokenOnMissingNetwork);
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setSourceToken(tokenOnMissingNetwork),
      );
    });
  });
});
