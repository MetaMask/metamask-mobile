import { renderHook, act } from '@testing-library/react-native';
import type { NetworkFormState } from '../NetworkDetailsView.types';
import { useFormModals } from './useFormModals';

const mockSetForm = jest.fn(
  (updater: React.SetStateAction<NetworkFormState>) => updater,
);

describe('useFormModals', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initializes with all modals closed', () => {
    const { result } = renderHook(() => useFormModals(0, 0, mockSetForm));

    expect(result.current.modals).toEqual({
      showMultiRpcAddModal: false,
      rpcModalShowForm: false,
      showMultiBlockExplorerAddModal: false,
      blockExplorerModalShowForm: false,
      showWarningModal: false,
    });
    expect(result.current.isAnyModalVisible).toBe(false);
  });

  describe('RPC modal', () => {
    it('opens RPC modal with form shown when rpcUrlsCount is 0', () => {
      const { result } = renderHook(() => useFormModals(0, 0, mockSetForm));

      act(() => result.current.openRpcModal());

      expect(result.current.modals.showMultiRpcAddModal).toBe(true);
      expect(result.current.modals.rpcModalShowForm).toBe(true);
      expect(result.current.isAnyModalVisible).toBe(true);
    });

    it('opens RPC modal without form shown when rpcUrlsCount > 0', () => {
      const { result } = renderHook(() => useFormModals(2, 0, mockSetForm));

      act(() => result.current.openRpcModal());

      expect(result.current.modals.showMultiRpcAddModal).toBe(true);
      expect(result.current.modals.rpcModalShowForm).toBe(false);
    });

    it('closes RPC modal and resets form fields', () => {
      const { result } = renderHook(() => useFormModals(0, 0, mockSetForm));

      act(() => result.current.openRpcModal());
      act(() => result.current.closeRpcModal());

      expect(result.current.modals.showMultiRpcAddModal).toBe(false);
      expect(mockSetForm).toHaveBeenCalled();
    });

    it('toggles rpcModalShowForm', () => {
      const { result } = renderHook(() => useFormModals(0, 0, mockSetForm));

      act(() => result.current.setRpcModalShowForm(true));
      expect(result.current.modals.rpcModalShowForm).toBe(true);

      act(() => result.current.setRpcModalShowForm(false));
      expect(result.current.modals.rpcModalShowForm).toBe(false);
    });
  });

  describe('Block explorer modal', () => {
    it('opens block explorer modal with form when count is 0', () => {
      const { result } = renderHook(() => useFormModals(0, 0, mockSetForm));

      act(() => result.current.openBlockExplorerModal());

      expect(result.current.modals.showMultiBlockExplorerAddModal).toBe(true);
      expect(result.current.modals.blockExplorerModalShowForm).toBe(true);
      expect(mockSetForm).toHaveBeenCalled();
    });

    it('opens block explorer modal without form when count > 0', () => {
      const { result } = renderHook(() => useFormModals(0, 3, mockSetForm));

      act(() => result.current.openBlockExplorerModal());

      expect(result.current.modals.showMultiBlockExplorerAddModal).toBe(true);
      expect(result.current.modals.blockExplorerModalShowForm).toBe(false);
    });

    it('closes block explorer modal', () => {
      const { result } = renderHook(() => useFormModals(0, 0, mockSetForm));

      act(() => result.current.openBlockExplorerModal());
      act(() => result.current.closeBlockExplorerModal());

      expect(result.current.modals.showMultiBlockExplorerAddModal).toBe(false);
    });

    it('toggles blockExplorerModalShowForm and resets form on show', () => {
      const { result } = renderHook(() => useFormModals(0, 0, mockSetForm));

      act(() => result.current.setBlockExplorerModalShowForm(true));
      expect(result.current.modals.blockExplorerModalShowForm).toBe(true);
      expect(mockSetForm).toHaveBeenCalled();

      mockSetForm.mockClear();
      act(() => result.current.setBlockExplorerModalShowForm(false));
      expect(result.current.modals.blockExplorerModalShowForm).toBe(false);
      expect(mockSetForm).not.toHaveBeenCalled();
    });
  });

  describe('Warning modal', () => {
    it('toggles warning modal', () => {
      const { result } = renderHook(() => useFormModals(0, 0, mockSetForm));

      act(() => result.current.toggleWarningModal());
      expect(result.current.modals.showWarningModal).toBe(true);

      act(() => result.current.toggleWarningModal());
      expect(result.current.modals.showWarningModal).toBe(false);
    });
  });
});
