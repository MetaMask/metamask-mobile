import { useCallback, useState } from 'react';
import type { ModalState, NetworkFormState } from '../NetworkDetailsView.types';

export interface UseFormModalsReturn {
  modals: ModalState;
  isAnyModalVisible: boolean;

  openRpcModal: () => void;
  closeRpcModal: () => void;
  setRpcModalShowForm: (show: boolean) => void;
  openBlockExplorerModal: () => void;
  closeBlockExplorerModal: () => void;
  setBlockExplorerModalShowForm: (show: boolean) => void;
  toggleWarningModal: () => void;
}

/**
 * Manages all modal-related state for the network details form.
 *
 * @param rpcUrlsCount - current number of RPC endpoints (drives whether the
 * RPC modal opens directly into the "add" form)
 * @param blockExplorerUrlsCount - current number of block explorer URLs
 * @param setForm - stable setState dispatcher from useNetworkForm, used to
 * reset transient form fields when modals close / open
 */
export const useFormModals = (
  rpcUrlsCount: number,
  blockExplorerUrlsCount: number,
  setForm: React.Dispatch<React.SetStateAction<NetworkFormState>>,
): UseFormModalsReturn => {
  const [modals, setModals] = useState<ModalState>({
    showMultiRpcAddModal: false,
    rpcModalShowForm: false,
    showMultiBlockExplorerAddModal: false,
    blockExplorerModalShowForm: false,
    showWarningModal: false,
  });

  const isAnyModalVisible =
    modals.showMultiRpcAddModal || modals.showMultiBlockExplorerAddModal;

  // ---- RPC modal -----------------------------------------------------------
  const openRpcModal = useCallback(
    () =>
      setModals((prev) => ({
        ...prev,
        showMultiRpcAddModal: true,
        rpcModalShowForm: rpcUrlsCount === 0,
      })),
    [rpcUrlsCount],
  );

  const closeRpcModal = useCallback(() => {
    setModals((prev) => ({ ...prev, showMultiRpcAddModal: false }));
    setForm((prev) => ({ ...prev, rpcUrlForm: '', rpcNameForm: '' }));
  }, [setForm]);

  const setRpcModalShowForm = useCallback(
    (show: boolean) =>
      setModals((prev) => ({ ...prev, rpcModalShowForm: show })),
    [],
  );

  // ---- Block explorer modal ------------------------------------------------
  const openBlockExplorerModal = useCallback(() => {
    const openDirectlyInForm = blockExplorerUrlsCount === 0;
    setModals((prev) => ({
      ...prev,
      showMultiBlockExplorerAddModal: true,
      blockExplorerModalShowForm: openDirectlyInForm,
    }));
    if (openDirectlyInForm) {
      setForm((prev) => ({ ...prev, blockExplorerUrlForm: undefined }));
    }
  }, [blockExplorerUrlsCount, setForm]);

  const closeBlockExplorerModal = useCallback(
    () =>
      setModals((prev) => ({
        ...prev,
        showMultiBlockExplorerAddModal: false,
      })),
    [],
  );

  const setBlockExplorerModalShowForm = useCallback(
    (show: boolean) => {
      setModals((prev) => ({ ...prev, blockExplorerModalShowForm: show }));
      if (show) {
        setForm((prev) => ({ ...prev, blockExplorerUrlForm: undefined }));
      }
    },
    [setForm],
  );

  // ---- Warning modal -------------------------------------------------------
  const toggleWarningModal = useCallback(
    () =>
      setModals((prev) => ({
        ...prev,
        showWarningModal: !prev.showWarningModal,
      })),
    [],
  );

  return {
    modals,
    isAnyModalVisible,
    openRpcModal,
    closeRpcModal,
    setRpcModalShowForm,
    openBlockExplorerModal,
    closeBlockExplorerModal,
    setBlockExplorerModalShowForm,
    toggleWarningModal,
  };
};
