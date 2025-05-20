import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../../../../../util/theme/models';
import { getNavbar } from '../../components/UI/navbar/navbar';
import { useConfirmActions } from '../useConfirmActions';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionBatchesMetadataRequest } from '../transactions/useTransactionBatchesMetadataRequest';
import { MMM_ORIGIN } from '../../constants/confirmations';
import useNavbar from './useNavbar';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../components/UI/navbar/navbar', () => ({
  getNavbar: jest.fn(),
}));

jest.mock('../useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

jest.mock('../transactions/useTransactionBatchesMetadataRequest', () => ({
  useTransactionBatchesMetadataRequest: jest.fn(),
}));

describe('useNavbar', () => {
  const mockSetOptions = jest.fn();
  const mockOnReject = jest.fn();
  const mockTitle = 'Test Title';

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      setOptions: mockSetOptions,
    });

    (useConfirmActions as jest.Mock).mockReturnValue({
      onReject: mockOnReject,
    });

    (getNavbar as jest.Mock).mockReturnValue({
      headerTitle: () => null,
      headerLeft: () => null,
    });

    // Default to wallet-initiated confirmation for existing tests
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      origin: MMM_ORIGIN,
    });
    
    // Mock useTransactionBatchesMetadataRequest to return null by default
    (useTransactionBatchesMetadataRequest as jest.Mock).mockReturnValue(null);
  });

  it('should call setOptions with the correct navbar configuration for wallet-initiated confirmations', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      origin: MMM_ORIGIN,
    });

    renderHook(() => useNavbar(mockTitle));

    expect(useNavigation).toHaveBeenCalled();
    expect(useConfirmActions).toHaveBeenCalled();
    expect(useTransactionMetadataRequest).toHaveBeenCalled();
    expect(useTransactionBatchesMetadataRequest).toHaveBeenCalled();
    expect(getNavbar).toHaveBeenCalledWith({
      title: mockTitle,
      onReject: mockOnReject,
      addBackButton: true,
      theme: expect.any(Object),
    });
    expect(mockSetOptions).toHaveBeenCalledWith(
      getNavbar({
        title: mockTitle,
        onReject: mockOnReject,
        addBackButton: true,
        theme: {} as Theme,
      }),
    );
  });

  it('should not call setOptions for non-wallet-initiated confirmations', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      origin: 'external-origin',
    });

    renderHook(() => useNavbar(mockTitle));

    expect(useNavigation).toHaveBeenCalled();
    expect(useConfirmActions).toHaveBeenCalled();
    expect(useTransactionMetadataRequest).toHaveBeenCalled();
    expect(useTransactionBatchesMetadataRequest).toHaveBeenCalled();
    expect(mockSetOptions).not.toHaveBeenCalled();
    expect(getNavbar).not.toHaveBeenCalled();
  });

  it('should not call setOptions when transactionMetadata is null or undefined', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue(null);

    renderHook(() => useNavbar(mockTitle));

    expect(useNavigation).toHaveBeenCalled();
    expect(useConfirmActions).toHaveBeenCalled();
    expect(useTransactionMetadataRequest).toHaveBeenCalled(); 
    expect(useTransactionBatchesMetadataRequest).toHaveBeenCalled();
    expect(mockSetOptions).not.toHaveBeenCalled();
    expect(getNavbar).not.toHaveBeenCalled();
  });

  it('should update navigation options when title changes for wallet-initiated confirmations', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      origin: MMM_ORIGIN,
    });

    const { rerender } = renderHook(({ title }) => useNavbar(title), {
      initialProps: { title: 'Initial Title' },
    });

    expect(mockSetOptions).toHaveBeenCalledTimes(1);

    rerender({ title: 'Updated Title' });

    expect(mockSetOptions).toHaveBeenCalledTimes(2);
    expect(getNavbar).toHaveBeenLastCalledWith({
      title: 'Updated Title',
      onReject: mockOnReject,
      addBackButton: true,
      theme: expect.any(Object),
    });
  });

  it('should update navigation options when onReject changes for wallet-initiated confirmations', () => {
    const newOnReject = jest.fn();
    (useConfirmActions as jest.Mock).mockReturnValue({
      onReject: newOnReject,
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      origin: MMM_ORIGIN,
    });

    renderHook(() => useNavbar(mockTitle));

    expect(getNavbar).toHaveBeenCalledWith({
      title: mockTitle,
      onReject: newOnReject,
      addBackButton: true,
      theme: expect.any(Object),
    });
  });
});
