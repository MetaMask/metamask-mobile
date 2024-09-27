import useModalHandler from './hooks/useModalHandler';

function ModalHandler({ children }) {
  const [isVisible, toggleModal, showModal, hideModal] = useModalHandler(false);

  if (typeof children === 'function') {
    return children({ isVisible, toggleModal, showModal, hideModal });
  }

  return children;
}

export default ModalHandler;
