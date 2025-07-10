import { renderHook } from '@testing-library/react-hooks';
import { useDeepLinkParams } from './index';
import { useSelector, useDispatch } from 'react-redux';
import {
  setSourceToken,
  setDestToken,
  setSourceAmount,
} from '../../../../../core/redux/slices/bridge';
import { useSwitchNetworks } from '../../../../Views/NetworkSelector/useSwitchNetworks';
import { useNetworkInfo } from '../../../../../selectors/selectedNetworkController';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  setSourceToken: jest.fn(),
  setDestToken: jest.fn(),
  setSourceAmount: jest.fn(),
  selectSourceToken: jest.fn(),
  selectDestToken: jest.fn(),
  selectSourceAmount: jest.fn(),
}));

jest.mock('../../../../Views/NetworkSelector/useSwitchNetworks', () => ({
  useSwitchNetworks: jest.fn(),
}));

jest.mock('../../../../../selectors/selectedNetworkController', () => ({
  useNetworkInfo: jest.fn(),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../useInitialSourceToken', () => ({
  getNativeSourceToken: jest.fn(() => ({
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: '0x1',
  })),
}));

const mockDispatch = jest.fn();
const mockOnSetRpcTarget = jest.fn();
const mockOnNonEvmNetworkChange = jest.fn();

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseSwitchNetworks = useSwitchNetworks as jest.MockedFunction<
  typeof useSwitchNetworks
>;
const mockUseNetworkInfo = useNetworkInfo as jest.MockedFunction<
  typeof useNetworkInfo
>;

describe('useDeepLinkParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSwitchNetworks.mockReturnValue({
      onSetRpcTarget: mockOnSetRpcTarget,
      onNonEvmNetworkChange: mockOnNonEvmNetworkChange,
      onNetworkChange: jest.fn(),
    });
    mockUseNetworkInfo.mockReturnValue({
      chainId: '0x1',
      domainIsConnectedDapp: false,
      networkName: 'Ethereum Mainnet',
      networkImageSource: {},
      domainNetworkClientId: undefined,
      rpcUrl: undefined,
    });

    // Default mock values
    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectChainId')) return '0x1';
      if (
        selector.toString().includes('selectEvmNetworkConfigurationsByChainId')
      )
        return {};
      if (selector.toString().includes('selectSourceToken')) return null;
      if (selector.toString().includes('selectDestToken')) return null;
      if (selector.toString().includes('selectSourceAmount')) return null;
      return null;
    });
  });

  describe('when no deep link parameters are provided', () => {
    it('does not dispatch any actions', () => {
      renderHook(() => useDeepLinkParams({}));

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('when from parameter is provided', () => {
    it('sets source token for valid CAIP-19 format', () => {
      const caipFrom =
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

      renderHook(() => useDeepLinkParams({ from: caipFrom }));

      expect(mockDispatch).toHaveBeenCalledWith(
        setSourceToken({
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: '',
          name: '',
          decimals: 18,
          chainId: '0x1',
        }),
      );
    });

    it('handles native token CAIP-19 format', () => {
      const caipFrom = 'eip155:1/slip44:60';

      renderHook(() => useDeepLinkParams({ from: caipFrom }));

      expect(mockDispatch).toHaveBeenCalledWith(
        setSourceToken({
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          chainId: '0x1',
        }),
      );
    });
  });

  describe('when to parameter is provided', () => {
    it('sets destination token for valid CAIP-19 format', () => {
      const caipTo =
        'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7';

      renderHook(() => useDeepLinkParams({ to: caipTo }));

      expect(mockDispatch).toHaveBeenCalledWith(
        setDestToken({
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          symbol: '',
          name: '',
          decimals: 18,
          chainId: '0x1',
        }),
      );
    });
  });

  describe('when amount parameter is provided', () => {
    it('does not process amount without source token', () => {
      const hexAmount = '0x38d7ea4c68000'; // 1 ETH in wei

      renderHook(() => useDeepLinkParams({ amount: hexAmount }));

      // Amount should not be processed without source token
      expect(mockDispatch).not.toHaveBeenCalledWith(setSourceAmount('1'));
    });
  });

  describe('when all parameters are provided', () => {
    it('processes all parameters correctly', () => {
      const params = {
        from: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        to: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
        amount: '1000000', // 1 USDC
      };

      renderHook(() => useDeepLinkParams(params));

      expect(mockDispatch).toHaveBeenCalledWith(
        setSourceToken({
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: '',
          name: '',
          decimals: 18,
          chainId: '0x1',
        }),
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        setDestToken({
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          symbol: '',
          name: '',
          decimals: 18,
          chainId: '0x1',
        }),
      );
    });
  });

  describe('error handling', () => {
    it('handles invalid CAIP-19 format gracefully', () => {
      const invalidCaip = 'invalid-caip-format';

      renderHook(() => useDeepLinkParams({ from: invalidCaip }));

      // Should not dispatch any actions for invalid format
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
