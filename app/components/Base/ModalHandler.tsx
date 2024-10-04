import { ReactNode } from 'react';
import useModalHandler from './hooks/useModalHandler';

interface ModalHandlerProps {
  children: ((props: {
    isVisible: boolean;
    toggleModal: () => void;
    showModal: () => void;
    hideModal: () => void;
  }) => ReactNode);
}

function ModalHandler({ children }: ModalHandlerProps) {
  const [isVisible, toggleModal, showModal, hideModal] = useModalHandler(false);

  if (typeof children === 'function') {
    return children({ isVisible, toggleModal, showModal, hideModal });
  }

  return children;
}

export default ModalHandler;
