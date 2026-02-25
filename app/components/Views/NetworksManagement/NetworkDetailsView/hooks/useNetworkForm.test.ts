import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { RpcEndpointType } from '@metamask/network-controller';
import { useNetworkForm } from './useNetworkForm';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../NetworkDetailsView.constants', () => ({
  allNetworks: ['mainnet', 'sepolia'],
  infuraProjectId: 'test-key',
}));

jest.mock('../NetworkDetailsView.utils', () => ({
  getDefaultBlockExplorerUrl: jest.fn(() => 'https://etherscan.io'),
}));

jest.mock('../../../../../util/networks', () => ({
  __esModule: true,
  default: {
    mainnet: { chainId: '0x1' },
    sepolia: { chainId: '0xaa36a7' },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockNetworkConfigurations = {
  '0x1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcEndpoints: [
      {
        url: 'https://mainnet.infura.io/v3/key',
        type: RpcEndpointType.Infura,
        networkClientId: 'mainnet',
      },
    ],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: ['https://etherscan.io'],
    defaultBlockExplorerUrlIndex: 0,
  },
};

describe('useNetworkForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockNetworkConfigurations);
  });

  describe('add mode', () => {
    it('initializes in add mode when no network param is provided', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      expect(result.current.form.addMode).toBe(true);
      expect(result.current.form.nickname).toBeUndefined();
      expect(result.current.form.chainId).toBeUndefined();
    });

    it('prefills form values when prefill is provided', () => {
      const { result } = renderHook(() =>
        useNetworkForm({
          prefill: {
            rpcUrl: 'https://rpc.custom.com',
            chainId: '137',
            nickname: 'Polygon',
            ticker: 'MATIC',
            blockExplorerUrl: 'https://polygonscan.com',
          },
        }),
      );

      expect(result.current.form.addMode).toBe(true);
      expect(result.current.form.nickname).toBe('Polygon');
      expect(result.current.form.chainId).toBe('137');
      expect(result.current.form.ticker).toBe('MATIC');
      expect(result.current.form.rpcUrl).toBe('https://rpc.custom.com');
      expect(result.current.form.rpcUrls).toHaveLength(1);
      expect(result.current.form.blockExplorerUrl).toBe(
        'https://polygonscan.com',
      );
      expect(result.current.form.blockExplorerUrls).toEqual([
        'https://polygonscan.com',
      ]);
    });
  });

  describe('edit mode', () => {
    it('populates form from built-in network type', () => {
      const { result } = renderHook(() =>
        useNetworkForm({ network: 'mainnet' }),
      );

      expect(result.current.form.addMode).toBe(false);
      expect(result.current.form.nickname).toBe('Ethereum Mainnet');
      expect(result.current.form.chainId).toBe('0x1');
      expect(result.current.form.ticker).toBe('ETH');
      expect(result.current.form.editable).toBe(false);
    });

    it('populates form from RPC URL match', () => {
      const { result } = renderHook(() =>
        useNetworkForm({
          network: 'https://mainnet.infura.io/v3/key',
        }),
      );

      expect(result.current.form.addMode).toBe(false);
      expect(result.current.form.nickname).toBe('Ethereum Mainnet');
      expect(result.current.form.rpcUrl).toBe(
        'https://mainnet.infura.io/v3/key',
      );
      expect(result.current.form.editable).toBe(true);
    });
  });

  describe('form field handlers', () => {
    it('updates nickname via onNicknameChange', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      act(() => result.current.onNicknameChange('New Name'));
      expect(result.current.form.nickname).toBe('New Name');
    });

    it('updates chainId via onChainIDChange', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      act(() => result.current.onChainIDChange('100'));
      expect(result.current.form.chainId).toBe('100');
    });

    it('updates ticker via onTickerChange', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      act(() => result.current.onTickerChange('XDAI'));
      expect(result.current.form.ticker).toBe('XDAI');
    });

    it('autofills name field', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      act(() => result.current.autoFillNameField('Auto Name'));
      expect(result.current.form.nickname).toBe('Auto Name');
    });

    it('autofills symbol field', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      act(() => result.current.autoFillSymbolField('SYM'));
      expect(result.current.form.ticker).toBe('SYM');
    });
  });

  describe('RPC handlers', () => {
    it('adds RPC URL in add mode, creating an endpoint', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      act(() => result.current.onRpcUrlAdd('https://new-rpc.example.com'));

      expect(result.current.form.rpcUrl).toBe('https://new-rpc.example.com');
      expect(result.current.form.rpcUrlForm).toBe(
        'https://new-rpc.example.com',
      );
      expect(result.current.form.rpcUrls).toHaveLength(1);
    });

    it('adds RPC name in add mode', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      act(() => result.current.onRpcUrlAdd('https://rpc.example.com'));
      act(() => result.current.onRpcNameAdd('My RPC'));

      expect(result.current.form.rpcName).toBe('My RPC');
      expect(result.current.form.rpcUrls[0].name).toBe('My RPC');
    });

    it('adds RPC item to the list in edit mode', () => {
      const { result } = renderHook(() =>
        useNetworkForm({ network: 'mainnet' }),
      );

      act(() =>
        result.current.onRpcItemAdd('https://new.example.com', 'New RPC'),
      );

      expect(result.current.form.rpcUrls.length).toBeGreaterThan(1);
      expect(result.current.form.rpcUrl).toBe('https://new.example.com');
      expect(result.current.form.rpcName).toBe('New RPC');
    });

    it('does not add empty RPC item', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));
      const initialLength = result.current.form.rpcUrls.length;

      act(() => result.current.onRpcItemAdd('', 'name'));

      expect(result.current.form.rpcUrls.length).toBe(initialLength);
    });

    it('changes RPC URL with name', () => {
      const { result } = renderHook(() =>
        useNetworkForm({ network: 'mainnet' }),
      );

      act(() =>
        result.current.onRpcUrlChangeWithName(
          'https://other.rpc.io',
          ['https://failover.rpc.io'],
          'Other',
          'Custom',
        ),
      );

      expect(result.current.form.rpcUrl).toBe('https://other.rpc.io');
      expect(result.current.form.failoverRpcUrls).toEqual([
        'https://failover.rpc.io',
      ]);
      expect(result.current.form.rpcName).toBe('Other');
    });

    it('uses type as name fallback when name is empty', () => {
      const { result } = renderHook(() =>
        useNetworkForm({ network: 'mainnet' }),
      );

      act(() =>
        result.current.onRpcUrlChangeWithName(
          'https://other.rpc.io',
          undefined,
          '',
          'Infura',
        ),
      );

      expect(result.current.form.rpcName).toBe('Infura');
    });

    it('deletes an RPC URL from the list', () => {
      const { result } = renderHook(() =>
        useNetworkForm({ network: 'mainnet' }),
      );

      act(() => result.current.onRpcItemAdd('https://extra.rpc.io', 'Extra'));

      const countBefore = result.current.form.rpcUrls.length;
      act(() => result.current.onRpcUrlDelete('https://extra.rpc.io'));
      expect(result.current.form.rpcUrls.length).toBe(countBefore - 1);
    });
  });

  describe('Block explorer handlers', () => {
    it('adds a block explorer URL', () => {
      const { result } = renderHook(() =>
        useNetworkForm({ network: 'mainnet' }),
      );

      act(() =>
        result.current.onBlockExplorerItemAdd('https://blockscout.com'),
      );

      expect(result.current.form.blockExplorerUrls).toContain(
        'https://blockscout.com',
      );
      expect(result.current.form.blockExplorerUrl).toBe(
        'https://blockscout.com',
      );
    });

    it('does not add duplicate block explorer URL', () => {
      const { result } = renderHook(() =>
        useNetworkForm({ network: 'mainnet' }),
      );

      act(() => result.current.onBlockExplorerItemAdd('https://etherscan.io'));
      const countAfter = result.current.form.blockExplorerUrls.filter(
        (u) => u === 'https://etherscan.io',
      ).length;
      expect(countAfter).toBe(1);
    });

    it('does not add empty block explorer URL', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      act(() => result.current.onBlockExplorerItemAdd(''));
      expect(result.current.form.blockExplorerUrls).toHaveLength(0);
    });

    it('changes block explorer URL in add mode', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      act(() =>
        result.current.onBlockExplorerUrlChange('https://scan.example.com'),
      );

      expect(result.current.form.blockExplorerUrl).toBe(
        'https://scan.example.com',
      );
      expect(result.current.form.blockExplorerUrls).toEqual([
        'https://scan.example.com',
      ]);
    });

    it('clears block explorer URLs when set to empty in add mode', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      act(() =>
        result.current.onBlockExplorerUrlChange('https://scan.example.com'),
      );
      act(() => result.current.onBlockExplorerUrlChange(''));

      expect(result.current.form.blockExplorerUrls).toEqual([]);
    });

    it('deletes a block explorer URL', () => {
      const { result } = renderHook(() =>
        useNetworkForm({ network: 'mainnet' }),
      );

      act(() =>
        result.current.onBlockExplorerItemAdd('https://blockscout.com'),
      );
      act(() =>
        result.current.onBlockExplorerUrlDelete('https://blockscout.com'),
      );

      expect(result.current.form.blockExplorerUrls).not.toContain(
        'https://blockscout.com',
      );
    });
  });

  describe('validation callback', () => {
    it('registers and invokes a validation callback', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));
      const cb = jest.fn();

      act(() => result.current.setValidationCallback(cb));
      act(() =>
        result.current.onRpcUrlChangeWithName(
          'https://rpc.io',
          undefined,
          'Name',
          'Custom',
        ),
      );

      expect(cb).toHaveBeenCalled();
    });

    it('clears validation callback when set to null', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));
      const cb = jest.fn();

      act(() => result.current.setValidationCallback(cb));
      act(() => result.current.setValidationCallback(null));
      act(() =>
        result.current.onRpcUrlChangeWithName(
          'https://rpc.io',
          undefined,
          'Name',
          'Custom',
        ),
      );

      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('modal and focus state delegation', () => {
    it('exposes modal state from useFormModals', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      expect(result.current.modals).toBeDefined();
      expect(result.current.isAnyModalVisible).toBe(false);
    });

    it('exposes focus state from useFormFocus', () => {
      const { result } = renderHook(() => useNetworkForm(undefined));

      expect(result.current.focus).toBeDefined();
      expect(result.current.focus.isNameFieldFocused).toBe(false);
    });
  });
});
