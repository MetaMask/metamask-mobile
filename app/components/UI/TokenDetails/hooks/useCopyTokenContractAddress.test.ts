import { renderHook, act } from '@testing-library/react-native';
import { ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useCopyTokenContractAddress } from './useCopyTokenContractAddress';

const mockSetString = jest.fn();
jest.mock('../../../../core/ClipboardManager', () => ({
  setString: (...args: unknown[]) => mockSetString(...args),
}));

const mockToast = jest.fn();
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign((...args: unknown[]) => mockToast(...args), {
      dismiss: jest.fn(),
    }),
  };
});

const CONTRACT_ADDRESS = '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477';

describe('useCopyTokenContractAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetString.mockResolvedValue(undefined);
  });

  it('copies contract address and shows success toast', async () => {
    const onCopyAddress = jest.fn();
    const { result } = renderHook(() =>
      useCopyTokenContractAddress(CONTRACT_ADDRESS, onCopyAddress),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockSetString).toHaveBeenCalledWith(CONTRACT_ADDRESS);
    expect(onCopyAddress).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: strings('account_details.account_copied_to_clipboard'),
      severity: ToastSeverity.Success,
      hasNoTimeout: false,
    });
  });

  it('does not copy or show toast when contract address is null', async () => {
    const onCopyAddress = jest.fn();
    const { result } = renderHook(() =>
      useCopyTokenContractAddress(null, onCopyAddress),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockSetString).not.toHaveBeenCalled();
    expect(onCopyAddress).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('copies contract address when onCopyAddress is omitted', async () => {
    const { result } = renderHook(() =>
      useCopyTokenContractAddress(CONTRACT_ADDRESS),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockSetString).toHaveBeenCalledWith(CONTRACT_ADDRESS);
    expect(mockToast).toHaveBeenCalledTimes(1);
  });
});
