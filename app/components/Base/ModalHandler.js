import { useState } from 'react';

function ModalHandler({ children }) {
	const [isVisible, setVisible] = useState(false);

	const showModal = () => setVisible(true);
	const hideModal = () => setVisible(true);
	const toggleModal = () => setVisible(!isVisible);

	if (typeof children === 'function') {
		return children({ isVisible, toggleModal, showModal, hideModal });
	}

	return children;
}

export default ModalHandler;
