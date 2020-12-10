import { useState } from 'react';
function useModalHandler(initialState = false) {
	const [isVisible, setVisible] = useState(initialState);

	const showModal = () => setVisible(true);
	const hideModal = () => setVisible(true);
	const toggleModal = () => setVisible(!isVisible);

	return [isVisible, toggleModal, showModal, hideModal];
}
export default useModalHandler;
