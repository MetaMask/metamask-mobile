import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  evmSendStateMock,
  EVM_NATIVE_ASSET,
  SOLANA_ASSET,
} from '../../__mocks__/send.mock';
import { useSendType } from './useSendType';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useSendContext } from '../../context/send-context';
import { AssetType } from '../../types/token';

const mockState = {
  state: evmSendStateMock,
};

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

describe('useSendType', () => {
  const mockUseParams = jest.mocked(useParams);
  const mockUseSendContext = jest.mocked(useSendContext);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue(undefined);
    mockUseSendContext.mockReturnValue({
      asset: undefined,
      chainId: undefined,
      fromAccount: undefined,
      from: '',
      maxValueMode: false,
      to: undefined,
      updateAsset: jest.fn(),
      updateTo: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });
  });

  describe('with no asset or predefined recipient', () => {
    it('returns undefined for all send types', () => {
      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current).toEqual({
        isEvmNativeSendType: undefined,
        isEvmSendType: undefined,
        isNonEvmNativeSendType: undefined,
        isNonEvmSendType: undefined,
        isSolanaSendType: undefined,
      });
    });
  });

  describe('EVM assets', () => {
    it('identifies EVM address as EVM send type', () => {
      mockUseSendContext.mockReturnValue({
        asset: {
          ...EVM_NATIVE_ASSET,
          address: '0x1234567890123456789012345678901234567890',
        } as unknown as AssetType,
        chainId: undefined,
        fromAccount: undefined,
        from: '',
        maxValueMode: false,
        to: undefined,
        updateAsset: jest.fn(),
        updateTo: jest.fn(),
        updateValue: jest.fn(),
        value: undefined,
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isEvmSendType).toBe(true);
    });

    it('identifies EVM native asset as EVM native send type', () => {
      mockUseSendContext.mockReturnValue({
        asset: EVM_NATIVE_ASSET as unknown as AssetType,
        chainId: undefined,
        fromAccount: undefined,
        from: '',
        maxValueMode: false,
        to: undefined,
        updateAsset: jest.fn(),
        updateTo: jest.fn(),
        updateValue: jest.fn(),
        value: undefined,
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isEvmSendType).toBe(true);
      expect(result.current.isEvmNativeSendType).toBe(true);
    });

    it('identifies EVM token as EVM send type but not native', () => {
      mockUseSendContext.mockReturnValue({
        asset: {
          ...EVM_NATIVE_ASSET,
          image: '',
          isNative: false,
        },
        chainId: undefined,
        fromAccount: undefined,
        from: '',
        maxValueMode: false,
        to: undefined,
        updateAsset: jest.fn(),
        updateTo: jest.fn(),
        updateValue: jest.fn(),
        value: undefined,
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isEvmSendType).toBe(true);
      expect(result.current.isEvmNativeSendType).toBe(false);
    });
  });

  describe('Solana assets', () => {
    it('identifies Solana chain ID as Solana send type', () => {
      mockUseSendContext.mockReturnValue({
        asset: SOLANA_ASSET,
        chainId: undefined,
        fromAccount: undefined,
        from: '',
        maxValueMode: false,
        to: undefined,
        updateAsset: jest.fn(),
        updateTo: jest.fn(),
        updateValue: jest.fn(),
        value: undefined,
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isSolanaSendType).toBe(true);
      expect(result.current.isNonEvmSendType).toBe(true);
    });

    it('identifies Solana native asset as non-EVM native send type', () => {
      mockUseSendContext.mockReturnValue({
        asset: SOLANA_ASSET,
        chainId: undefined,
        fromAccount: undefined,
        from: '',
        maxValueMode: false,
        to: undefined,
        updateAsset: jest.fn(),
        updateTo: jest.fn(),
        updateValue: jest.fn(),
        value: undefined,
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isNonEvmNativeSendType).toBe(true);
      expect(result.current.isSolanaSendType).toBe(true);
    });
  });

  describe('predefined recipients', () => {
    it('identifies predefined EVM recipient as EVM send type', () => {
      mockUseParams.mockReturnValue({
        predefinedRecipient: {
          address: '0x1234567890123456789012345678901234567890',
          chainType: 'evm',
        },
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isEvmSendType).toBe(true);
    });

    it('identifies predefined Solana recipient as Solana send type', () => {
      mockUseParams.mockReturnValue({
        predefinedRecipient: {
          address: '7W54AwGDYRF7Xmoi6phjTnrQhruYtoUdCKJMYAXP7VWC',
          chainType: 'solana',
        },
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isSolanaSendType).toBe(true);
      expect(result.current.isNonEvmSendType).toBe(true);
    });
  });

  describe('EVM vs non-EVM detection', () => {
    it('returns undefined for EVM when asset has no address', () => {
      mockUseSendContext.mockReturnValue({
        asset: {
          ...EVM_NATIVE_ASSET,
          address: undefined as unknown as string,
        },
        chainId: undefined,
        fromAccount: undefined,
        from: '',
        maxValueMode: false,
        to: undefined,
        updateAsset: jest.fn(),
        updateTo: jest.fn(),
        updateValue: jest.fn(),
        value: undefined,
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isEvmSendType).toBeUndefined();
    });

    it('returns undefined for non-EVM when asset has no chainId', () => {
      mockUseSendContext.mockReturnValue({
        asset: {
          ...SOLANA_ASSET,
          chainId: undefined as unknown as string,
        },
        chainId: undefined,
        fromAccount: undefined,
        from: '',
        maxValueMode: false,
        to: undefined,
        updateAsset: jest.fn(),
        updateTo: jest.fn(),
        updateValue: jest.fn(),
        value: undefined,
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isNonEvmSendType).toBeUndefined();
    });
  });

  describe('native asset detection', () => {
    it('returns undefined for native status when asset has no isNative property', () => {
      mockUseSendContext.mockReturnValue({
        asset: {
          address: '0x1234567890123456789012345678901234567890',
        } as unknown as typeof EVM_NATIVE_ASSET,
        chainId: undefined,
        fromAccount: undefined,
        from: '',
        maxValueMode: false,
        to: undefined,
        updateAsset: jest.fn(),
        updateTo: jest.fn(),
        updateValue: jest.fn(),
        value: undefined,
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isEvmNativeSendType).toBeUndefined();
      expect(result.current.isNonEvmNativeSendType).toBeUndefined();
    });

    it('handles false native status correctly', () => {
      mockUseSendContext.mockReturnValue({
        asset: {
          ...EVM_NATIVE_ASSET,
          isNative: false,
          image: '',
        },
        chainId: undefined,
        fromAccount: undefined,
        from: '',
        maxValueMode: false,
        to: undefined,
        updateAsset: jest.fn(),
        updateTo: jest.fn(),
        updateValue: jest.fn(),
        value: undefined,
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isEvmNativeSendType).toBe(false);
    });
  });

  describe('predefined recipient priority', () => {
    it('prioritizes predefined EVM over asset address', () => {
      mockUseParams.mockReturnValue({
        predefinedRecipient: {
          address: '0x1234567890123456789012345678901234567890',
          chainType: 'evm',
        },
      });
      mockUseSendContext.mockReturnValue({
        asset: SOLANA_ASSET,
        chainId: undefined,
        fromAccount: undefined,
        from: '',
        maxValueMode: false,
        to: undefined,
        updateAsset: jest.fn(),
        updateTo: jest.fn(),
        updateValue: jest.fn(),
        value: undefined,
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isEvmSendType).toBe(true);
    });

    it('prioritizes predefined Solana over asset chainId', () => {
      mockUseParams.mockReturnValue({
        predefinedRecipient: {
          address: '7W54AwGDYRF7Xmoi6phjTnrQhruYtoUdCKJMYAXP7VWC',
          chainType: 'solana',
        },
      });
      mockUseSendContext.mockReturnValue({
        asset: EVM_NATIVE_ASSET,
        chainId: undefined,
        fromAccount: undefined,
        from: '',
        maxValueMode: false,
        to: undefined,
        updateAsset: jest.fn(),
        updateTo: jest.fn(),
        updateValue: jest.fn(),
        value: undefined,
      });

      const { result } = renderHookWithProvider(() => useSendType(), mockState);

      expect(result.current.isSolanaSendType).toBe(true);
    });
  });
});
