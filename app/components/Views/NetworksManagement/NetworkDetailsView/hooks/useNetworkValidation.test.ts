import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { NetworkFormState } from '../NetworkDetailsView.types';
import { useNetworkValidation } from './useNetworkValidation';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/jsonRpcRequest', () => ({
  jsonRpcRequest: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../NetworkDetailsView.utils', () => ({
  templateInfuraRpc: (url: string) => url,
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockWithConfigs = (configs: Record<string, unknown>) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector.name?.includes('SafeChainsListValidation')) return true;
    return configs;
  });
};

const baseForm: NetworkFormState = {
  rpcUrl: 'https://rpc.example.com',
  failoverRpcUrls: undefined,
  rpcName: undefined,
  rpcUrlForm: '',
  rpcNameForm: '',
  rpcUrls: [],
  blockExplorerUrls: [],
  selectedRpcEndpointIndex: 0,
  blockExplorerUrl: undefined,
  blockExplorerUrlForm: undefined,
  nickname: 'TestNet',
  chainId: '42',
  ticker: 'TST',
  editable: undefined,
  addMode: true,
};

describe('useNetworkValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector.name?.includes('SafeChainsListValidation')) return true;
      // networkConfigurations
      return {};
    });
  });

  it('initializes with clean validation state', () => {
    const { result } = renderHook(() => useNetworkValidation());

    expect(result.current.warningRpcUrl).toBeUndefined();
    expect(result.current.warningChainId).toBeUndefined();
    expect(result.current.warningSymbol).toBeUndefined();
    expect(result.current.warningName).toBeUndefined();
    expect(result.current.validatedRpcURL).toBe(true);
    expect(result.current.validatedChainId).toBe(true);
    expect(result.current.validatedSymbol).toBe(true);
  });

  describe('checkIfChainIdExists', () => {
    it('returns false when no configurations exist', () => {
      const { result } = renderHook(() => useNetworkValidation());
      expect(result.current.checkIfChainIdExists('1')).toBe(false);
    });

    it('returns true when chainId matches an existing config', () => {
      mockWithConfigs({ '0x1': { chainId: '0x1' } });
      const { result } = renderHook(() => useNetworkValidation());
      expect(result.current.checkIfChainIdExists('1')).toBe(true);
    });

    it('returns false for invalid chainId input', () => {
      const { result } = renderHook(() => useNetworkValidation());
      expect(result.current.checkIfChainIdExists('not-a-number')).toBe(false);
    });
  });

  describe('checkIfRpcUrlExists', () => {
    it('returns empty array when no match', async () => {
      const { result } = renderHook(() => useNetworkValidation());
      const matches = await result.current.checkIfRpcUrlExists(
        'https://unknown.example.com',
      );
      expect(matches).toEqual([]);
    });

    it('returns matching config when rpc url exists', async () => {
      mockWithConfigs({
        '0x1': {
          chainId: '0x1',
          rpcEndpoints: [{ url: 'https://rpc.example.com' }],
        },
      });
      const { result } = renderHook(() => useNetworkValidation());
      const matches = await result.current.checkIfRpcUrlExists(
        'https://rpc.example.com',
      );
      expect(matches).toHaveLength(1);
    });
  });

  describe('validateChainId', () => {
    it('sets warning when chainId is empty', async () => {
      const { result } = renderHook(() => useNetworkValidation());

      await act(async () => {
        await result.current.validateChainId({
          ...baseForm,
          chainId: undefined,
        });
      });

      expect(result.current.warningChainId).toBeDefined();
    });

    it('sets warning for invalid hex chain ID', async () => {
      const { result } = renderHook(() => useNetworkValidation());

      await act(async () => {
        await result.current.validateChainId({
          ...baseForm,
          chainId: '0xZZZZ',
        });
      });

      expect(result.current.warningChainId).toBeDefined();
    });

    it('sets warning for decimal with leading zeros', async () => {
      const { result } = renderHook(() => useNetworkValidation());

      await act(async () => {
        await result.current.validateChainId({
          ...baseForm,
          chainId: '01',
        });
      });

      expect(result.current.warningChainId).toBeDefined();
    });

    it('sets warning for non-numeric chain ID', async () => {
      const { result } = renderHook(() => useNetworkValidation());

      await act(async () => {
        await result.current.validateChainId({
          ...baseForm,
          chainId: 'abc',
        });
      });

      expect(result.current.warningChainId).toBeDefined();
    });
  });

  describe('disabledByChainId', () => {
    it('returns true when chainId is empty', () => {
      const { result } = renderHook(() => useNetworkValidation());
      expect(
        result.current.disabledByChainId({ ...baseForm, chainId: undefined }),
      ).toBe(true);
    });

    it('returns false when chainId is valid and validated', () => {
      const { result } = renderHook(() => useNetworkValidation());
      expect(result.current.disabledByChainId(baseForm)).toBe(false);
    });
  });

  describe('disabledBySymbol', () => {
    it('returns true when ticker is empty', () => {
      const { result } = renderHook(() => useNetworkValidation());
      expect(
        result.current.disabledBySymbol({ ...baseForm, ticker: undefined }),
      ).toBe(true);
    });

    it('returns false when ticker is present', () => {
      const { result } = renderHook(() => useNetworkValidation());
      expect(result.current.disabledBySymbol(baseForm)).toBe(false);
    });
  });

  describe('onRpcUrlValidationChange', () => {
    it('updates validatedRpcURL state', () => {
      const { result } = renderHook(() => useNetworkValidation());

      act(() => result.current.onRpcUrlValidationChange(false));
      expect(result.current.validatedRpcURL).toBe(false);

      act(() => result.current.onRpcUrlValidationChange(true));
      expect(result.current.validatedRpcURL).toBe(true);
    });
  });

  describe('setWarningRpcUrl', () => {
    it('sets and clears warning', () => {
      const { result } = renderHook(() => useNetworkValidation());

      act(() => result.current.setWarningRpcUrl('some warning'));
      expect(result.current.warningRpcUrl).toBe('some warning');

      act(() => result.current.setWarningRpcUrl(undefined));
      expect(result.current.warningRpcUrl).toBeUndefined();
    });
  });

  describe('setWarningChainId', () => {
    it('sets and clears warning', () => {
      const { result } = renderHook(() => useNetworkValidation());

      act(() => result.current.setWarningChainId('chain warning'));
      expect(result.current.warningChainId).toBe('chain warning');

      act(() => result.current.setWarningChainId(undefined));
      expect(result.current.warningChainId).toBeUndefined();
    });
  });

  describe('validateChainIdOnSubmit', () => {
    it('returns false and sets warning when RPC call fails', async () => {
      const { jsonRpcRequest } = jest.requireMock(
        '../../../../../util/jsonRpcRequest',
      );
      jsonRpcRequest.mockRejectedValueOnce(new Error('network error'));

      const { result } = renderHook(() => useNetworkValidation());

      let valid: boolean = true;
      await act(async () => {
        valid = await result.current.validateChainIdOnSubmit(
          '42',
          '0x2a',
          'https://rpc.example.com',
        );
      });

      expect(valid).toBe(false);
      expect(result.current.warningChainId).toBeDefined();
    });

    it('returns false when endpoint returns different chain ID', async () => {
      const { jsonRpcRequest } = jest.requireMock(
        '../../../../../util/jsonRpcRequest',
      );
      jsonRpcRequest.mockResolvedValueOnce('0x1');

      const { result } = renderHook(() => useNetworkValidation());

      let valid: boolean = true;
      await act(async () => {
        valid = await result.current.validateChainIdOnSubmit(
          '42',
          '0x2a',
          'https://rpc.example.com',
        );
      });

      expect(valid).toBe(false);
      expect(result.current.warningChainId).toBeDefined();
    });

    it('returns true when endpoint returns matching chain ID', async () => {
      const { jsonRpcRequest } = jest.requireMock(
        '../../../../../util/jsonRpcRequest',
      );
      jsonRpcRequest.mockResolvedValueOnce('0x2a');

      const { result } = renderHook(() => useNetworkValidation());

      let valid: boolean = false;
      await act(async () => {
        valid = await result.current.validateChainIdOnSubmit(
          '42',
          '0x2a',
          'https://rpc.example.com',
        );
      });

      expect(valid).toBe(true);
    });
  });

  describe('validateSymbol', () => {
    it('clears warning for whitelisted symbol', () => {
      const { result } = renderHook(() => useNetworkValidation());

      act(() => {
        result.current.validateSymbol({
          ...baseForm,
          chainId: '0x1',
          ticker: 'ETH',
        });
      });

      expect(result.current.warningSymbol).toBeUndefined();
    });

    it('sets validatedSymbol to true when ticker is present', () => {
      const { result } = renderHook(() => useNetworkValidation());

      act(() => {
        result.current.validateSymbol(baseForm);
      });

      expect(result.current.validatedSymbol).toBe(true);
    });

    it('sets validatedSymbol to false when ticker is empty', () => {
      const { result } = renderHook(() => useNetworkValidation());

      act(() => {
        result.current.validateSymbol({
          ...baseForm,
          chainId: '0x1',
          ticker: '',
        });
      });

      expect(result.current.validatedSymbol).toBe(false);
    });
  });

  describe('validateName', () => {
    it('does nothing when useSafeChainsListValidation is false', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector.name?.includes('SafeChainsListValidation')) return false;
        return {};
      });
      const { result } = renderHook(() => useNetworkValidation());

      act(() => result.current.validateName(baseForm));

      expect(result.current.warningName).toBeFalsy();
    });
  });

  describe('validateRpcAndChainId', () => {
    it('calls validateName and validateSymbol', () => {
      const { result } = renderHook(() => useNetworkValidation());

      act(() => {
        result.current.validateRpcAndChainId(baseForm);
      });

      // Should not throw and should have run validation
      expect(result.current.validatedSymbol).toBe(true);
    });
  });

  describe('validateChainId — existing chain ID scenarios', () => {
    it('warns when chainId exists and rpc also exists (not editable)', async () => {
      mockWithConfigs({
        '0x2a': {
          chainId: '0x2a',
          rpcEndpoints: [{ url: 'https://rpc.example.com' }],
        },
      });
      const { result } = renderHook(() => useNetworkValidation());

      await act(async () => {
        await result.current.validateChainId({
          ...baseForm,
          editable: false,
        });
      });

      expect(result.current.warningChainId).toBeDefined();
    });

    it('warns when chainId exists but rpc does not (not editable)', async () => {
      mockWithConfigs({
        '0x2a': {
          chainId: '0x2a',
          rpcEndpoints: [{ url: 'https://other.rpc.com' }],
        },
      });
      const { result } = renderHook(() => useNetworkValidation());

      await act(async () => {
        await result.current.validateChainId({
          ...baseForm,
          editable: false,
        });
      });

      expect(result.current.warningChainId).toBeDefined();
    });

    it('warns for hex chainId with leading zeros', async () => {
      const { result } = renderHook(() => useNetworkValidation());

      await act(async () => {
        await result.current.validateChainId({
          ...baseForm,
          chainId: '0x0042',
        });
      });

      expect(result.current.warningChainId).toBeDefined();
    });
  });

  describe('validateChainIdOnSubmit — decimal conversion path', () => {
    it('converts endpoint chainId to decimal when formChainId is decimal', async () => {
      const { jsonRpcRequest } = jest.requireMock(
        '../../../../../util/jsonRpcRequest',
      );
      jsonRpcRequest.mockResolvedValueOnce('0x1');

      const { result } = renderHook(() => useNetworkValidation());

      let valid: boolean = true;
      await act(async () => {
        valid = await result.current.validateChainIdOnSubmit(
          '42',
          '0x2a',
          'https://rpc.example.com',
        );
      });

      expect(valid).toBe(false);
    });
  });

  describe('checkIfNetworkExists', () => {
    it('returns matching config by default rpc endpoint', async () => {
      mockWithConfigs({
        '0x1': {
          chainId: '0x1',
          rpcEndpoints: [{ url: 'https://rpc.example.com' }],
          defaultRpcEndpointIndex: 0,
        },
      });
      const { result } = renderHook(() => useNetworkValidation());
      const matches = await result.current.checkIfNetworkExists(
        'https://rpc.example.com',
      );
      expect(matches).toHaveLength(1);
    });

    it('returns empty when default rpc does not match', async () => {
      mockWithConfigs({
        '0x1': {
          chainId: '0x1',
          rpcEndpoints: [
            { url: 'https://primary.rpc.com' },
            { url: 'https://rpc.example.com' },
          ],
          defaultRpcEndpointIndex: 0,
        },
      });
      const { result } = renderHook(() => useNetworkValidation());
      const matches = await result.current.checkIfNetworkExists(
        'https://rpc.example.com',
      );
      expect(matches).toHaveLength(0);
    });
  });

  describe('validateSymbol — non-whitelisted path', () => {
    it('sets warning when ticker differs from network config symbol', () => {
      mockWithConfigs({
        '0x89': { chainId: '0x89', nativeCurrency: 'MATIC' },
      });
      const { result } = renderHook(() => useNetworkValidation());

      act(() => {
        result.current.validateSymbol({
          ...baseForm,
          chainId: '0x89',
          ticker: 'WRONG',
        });
      });

      expect(result.current.warningSymbol).toBe('MATIC');
    });

    it('clears warning when ticker matches network config symbol (case insensitive)', () => {
      mockWithConfigs({
        '0x89': { chainId: '0x89', nativeCurrency: 'MATIC' },
      });
      const { result } = renderHook(() => useNetworkValidation());

      act(() => {
        result.current.validateSymbol({
          ...baseForm,
          chainId: '0x89',
          ticker: 'matic',
        });
      });

      expect(result.current.warningSymbol).toBeUndefined();
    });
  });
});
