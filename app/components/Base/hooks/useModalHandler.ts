import { useCallback, useState } from 'react';

/**
 * Hook to handle modal visibility state
 * @param initialState Initial state of the modal, if true modal will be visible
 * @return Handlers `[isVisible, toggleModal, showModal, hideModal]`
 */
function useModalHandler(initialState = false) {
  const [isVisible, setVisible] = useState(initialState);

  const showModal = useCallback(() => setVisible(true), []);
  const hideModal = useCallback(() => setVisible(false), []);
  const toggleModal = useCallback(() => setVisible((visible) => !visible), []);

  return [isVisible, toggleModal, showModal, hideModal] as const;
}
export default useModalHandler;
