import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { usePerpsPayWithToken } from '../../hooks/useIsPerpsBalanceSelected';
import { useDefaultPayWithTokenWhenNoPerpsBalance } from '../../hooks/useDefaultPayWithTokenWhenNoPerpsBalance';
import { usePerpsSelector } from '../../hooks/usePerpsSelector';
import { useInitPerpsPaymentToken } from './useInitPerpsPaymentToken';

jest.mock('../../../../Views/confirmations/hooks/pay/useTransactionPayToken');
jest.mock('../../hooks/useIsPerpsBalanceSelected', () => ({
  usePerpsPayWithToken: jest.fn(),
}));
jest.mock('../../hooks/useDefaultPayWithTokenWhenNoPerpsBalance');
jest.mock('../../hooks/usePerpsSelector');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      setSelectedPaymentToken: jest.fn(),
    },
  },
}));

const mockSetPayToken = jest.fn();
const mockUseTransactionPayToken =
  useTransactionPayToken as jest.MockedFunction<typeof useTransactionPayToken>;
const mockUsePerpsPayWithToken = usePerpsPayWithToken as jest.MockedFunction<
  typeof usePerpsPayWithToken
>;
const mockUseDefaultPayToken =
  useDefaultPayWithTokenWhenNoPerpsBalance as jest.MockedFunction<
    typeof useDefaultPayWithTokenWhenNoPerpsBalance
  >;
const mockUsePerpsSelector = usePerpsSelector as jest.MockedFunction<
  typeof usePerpsSelector
>;
const mockSetSelectedPaymentToken = Engine.context.PerpsController
  ?.setSelectedPaymentToken as jest.Mock;

function setupDefaults({
  payToken = null,
  selectedPaymentToken = null,
  defaultPayToken = null,
  pendingConfig = undefined,
}: {
  payToken?: ReturnType<typeof useTransactionPayToken>['payToken'];
  selectedPaymentToken?: ReturnType<typeof usePerpsPayWithToken>;
  defaultPayToken?: ReturnType<typeof useDefaultPayWithTokenWhenNoPerpsBalance>;
  pendingConfig?:
    | {
        selectedPaymentToken?: {
          address: string;
          chainId: string;
          description?: string;
        };
      }
    | undefined;
} = {}) {
  mockUseTransactionPayToken.mockReturnValue({
    payToken,
    setPayToken: mockSetPayToken,
  } as unknown as ReturnType<typeof useTransactionPayToken>);
  mockUsePerpsPayWithToken.mockReturnValue(selectedPaymentToken);
  mockUseDefaultPayToken.mockReturnValue(defaultPayToken);
  mockUsePerpsSelector.mockReturnValue(pendingConfig);
}

describe('useInitPerpsPaymentToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaults();
  });

  it('clears selected payment token on unmount', () => {
    const { unmount } = renderHook(() => useInitPerpsPaymentToken('BTC'));

    mockSetSelectedPaymentToken.mockClear();

    unmount();

    expect(mockSetSelectedPaymentToken).toHaveBeenCalledWith(null);
  });

  it('sets default pay token when no pending config and no perps balance', () => {
    const defaultToken = {
      address: '0xusdc',
      chainId: '0xa4b1',
      description: 'USDC',
    };
    setupDefaults({ defaultPayToken: defaultToken });

    renderHook(() => useInitPerpsPaymentToken('BTC'));

    expect(mockSetPayToken).toHaveBeenCalledWith({
      address: '0xusdc',
      chainId: '0xa4b1',
    });
    expect(mockSetSelectedPaymentToken).toHaveBeenCalledWith({
      description: 'USDC',
      address: '0xusdc',
      chainId: '0xa4b1',
    });
  });

  it('does not set default token when pending config has a selected payment token', () => {
    const defaultToken = {
      address: '0xusdc',
      chainId: '0xa4b1',
      description: 'USDC',
    };
    setupDefaults({
      defaultPayToken: defaultToken,
      pendingConfig: {
        selectedPaymentToken: {
          address: '0xdai',
          chainId: '0x1',
          description: 'DAI',
        },
      },
    });

    renderHook(() => useInitPerpsPaymentToken('BTC'));

    expect(mockSetPayToken).not.toHaveBeenCalledWith({
      address: '0xusdc',
      chainId: '0xa4b1',
    });
  });

  it('applies pending config payment token when it differs from current', () => {
    setupDefaults({
      payToken: null,
      selectedPaymentToken: null,
      pendingConfig: {
        selectedPaymentToken: {
          address: '0xdai',
          chainId: '0x1',
          description: 'DAI',
        },
      },
    });

    renderHook(() => useInitPerpsPaymentToken('BTC'));

    expect(mockSetPayToken).toHaveBeenCalledWith({
      address: '0xdai',
      chainId: '0x1',
    });
    expect(mockSetSelectedPaymentToken).toHaveBeenCalledWith({
      description: 'DAI',
      address: '0xdai',
      chainId: '0x1',
    });
  });

  it('does not reapply pending config when already matching', () => {
    const pendingToken = {
      address: '0xdai',
      chainId: '0x1',
      description: 'DAI',
    };
    setupDefaults({
      payToken: { address: '0xdai', chainId: '0x1' } as ReturnType<
        typeof useTransactionPayToken
      >['payToken'],
      selectedPaymentToken: { address: '0xdai', chainId: '0x1' },
      pendingConfig: { selectedPaymentToken: pendingToken },
    });

    const { rerender } = renderHook(() => useInitPerpsPaymentToken('BTC'));

    mockSetPayToken.mockClear();
    mockSetSelectedPaymentToken.mockClear();

    rerender({});

    expect(mockSetPayToken).not.toHaveBeenCalled();
    expect(mockSetSelectedPaymentToken).not.toHaveBeenCalledWith(
      expect.objectContaining({ address: '0xdai' }),
    );
  });

  it('resets applied pending token ref when initialAsset changes', () => {
    const pendingToken = {
      address: '0xdai',
      chainId: '0x1',
      description: 'DAI',
    };
    setupDefaults({
      payToken: null,
      selectedPaymentToken: null,
      pendingConfig: { selectedPaymentToken: pendingToken },
    });

    const { rerender } = renderHook(
      ({ asset }: { asset: string }) => useInitPerpsPaymentToken(asset),
      { initialProps: { asset: 'BTC' } },
    );

    mockSetPayToken.mockClear();
    mockSetSelectedPaymentToken.mockClear();

    rerender({ asset: 'ETH' });

    expect(mockSetPayToken).toHaveBeenCalledWith({
      address: '0xdai',
      chainId: '0x1',
    });
  });

  it('clears controller token when no pending config and no default token', () => {
    setupDefaults({
      defaultPayToken: null,
      pendingConfig: undefined,
    });

    renderHook(() => useInitPerpsPaymentToken('BTC'));

    expect(mockSetPayToken).not.toHaveBeenCalled();
  });

  it('does not set default token when default is null', () => {
    setupDefaults({ defaultPayToken: null });

    renderHook(() => useInitPerpsPaymentToken('BTC'));

    expect(mockSetPayToken).not.toHaveBeenCalled();
  });
});
