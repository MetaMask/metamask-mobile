import React from 'react';
import { View } from 'react-native';
import Text from '../../Base/Text';
import InfoModal from '../Swaps/components/InfoModal';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';

const TimeEstimateInfoModal = ({ timeEstimateId, isVisible, onHideModal }) => (
	<InfoModal
		isVisible={isVisible}
		toggleModal={onHideModal}
		body={
			<View>
				<Text>
					{timeEstimateId === 'unknown' && strings('times_eip1559.warning_unknown')}
					{timeEstimateId === 'low' && strings('times_eip1559.warning_low')}
				</Text>
			</View>
		}
	/>
);

TimeEstimateInfoModal.propTypes = {
	/**
	 * Time estimate name (unknown, low, medium, high, less_than, range)
	 */
	timeEstimateId: PropTypes.string,
	/**
	 * If the modal is visible
	 */
	isVisible: PropTypes.bool,
	/**
	 * Function to hide the modal
	 */
	onHideModal: PropTypes.func
};

export default TimeEstimateInfoModal;
