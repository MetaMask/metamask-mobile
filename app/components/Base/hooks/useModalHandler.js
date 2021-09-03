import { useCallback, useState } from 'react';

/**
 * @typedef {Boolean} isVisible boolean value that represent wether the modal is visible or not
 * @typedef {Function} toggleModal function that toggles the isVisible boolean value
 * @typedef {Function} showModal function that sets isVisible boolean to true
 * @typedef {Function} hideModal function that sets isVisible boolean to false
 * @typedef {[isVisible, toggleModal, showModal, hideModal]} Handlers
 */

/**
 * Hook to handle modal visibility state
 * @param {Boolean} initialState Initial state of the modal, if true modal will be visible
 * @return {Handlers} Handlers `[isVisible, toggleModal, showModal, hideModal]`
 */
function useModalHandler(initialState = false) {
	const [isVisible, setVisible] = useState(initialState);

	const showModal = useCallback(() => setVisible(true), []);
	const hideModal = useCallback(() => setVisible(false), []);
	const toggleModal = useCallback(() => setVisible((visible) => !visible), []);

	return [isVisible, toggleModal, showModal, hideModal];
}
export default useModalHandler;
