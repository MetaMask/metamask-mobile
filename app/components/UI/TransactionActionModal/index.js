import React from 'react';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import ActionModal from '../ActionModal';
import TransactionActionContent from './TransactionActionContent';

/**
 * View that renders a modal to be used for speed up or cancel transaction modal
 */
export default function TransactionActionModal({
	isVisible,
	confirmDisabled,
	onCancelPress,
	onConfirmPress,
	confirmText,
	cancelText,
	feeText,
	titleText,
	gasTitleText,
	descriptionText,
	cancelButtonMode,
	confirmButtonMode
}) {
	return (
		<ActionModal
			modalVisible={isVisible}
			confirmText={confirmText}
			cancelText={cancelText}
			onConfirmPress={onConfirmPress}
			onCancelPress={onCancelPress}
			onRequestClose={onCancelPress}
			cancelButtonMode={cancelButtonMode}
			confirmButtonMode={confirmButtonMode}
		>
			<TransactionActionContent
				confirmDisabled={confirmDisabled}
				feeText={feeText}
				titleText={titleText}
				gasTitleText={gasTitleText}
				descriptionText={descriptionText}
			/>
		</ActionModal>
	);
}

TransactionActionModal.defaultProps = {
	cancelButtonMode: 'neutral',
	confirmButtonMode: 'warning',
	cancelText: strings('action_view.cancel'),
	confirmText: strings('action_view.confirm'),
	confirmDisabled: false,
	displayCancelButton: true,
	displayConfirmButton: true
};

TransactionActionModal.propTypes = {
	isVisible: PropTypes.bool,
	/**
	 * Text to show in the cancel button
	 */
	cancelText: PropTypes.string,
	/**
	 * Whether confirm button is disabled
	 */
	confirmDisabled: PropTypes.bool,
	/**
	 * Text to show in the confirm button
	 */
	confirmText: PropTypes.string,
	/**
	 * Called when the cancel button is clicked
	 */
	onCancelPress: PropTypes.func,
	/**
	 * Called when the confirm button is clicked
	 */
	onConfirmPress: PropTypes.func,
	cancelButtonMode: PropTypes.string,
	confirmButtonMode: PropTypes.string,
	feeText: PropTypes.string,
	titleText: PropTypes.string,
	gasTitleText: PropTypes.string,
	descriptionText: PropTypes.string
};
