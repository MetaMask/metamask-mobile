import React from 'react';
import { View } from 'react-native';
import Text from '../../Base/Text';
import InfoModal from '../Swaps/components/InfoModal';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';

const TimeEstimateInfoModal = ({ timeEstimateId, isVisible, onHideModal }) => (
  <InfoModal
    isVisible={isVisible}
    toggleModal={onHideModal}
    title={
      timeEstimateId === AppConstants.GAS_TIMES.MAYBE
        ? strings('times_eip1559.warning_low_title')
        : timeEstimateId === AppConstants.GAS_TIMES.UNKNOWN
        ? strings('times_eip1559.warning_unknown_title')
        : timeEstimateId === AppConstants.GAS_TIMES.VERY_LIKELY
        ? strings('times_eip1559.warning_very_likely_title')
        : null
    }
    body={
      <View>
        <Text>
          {timeEstimateId === AppConstants.GAS_TIMES.UNKNOWN &&
            strings('times_eip1559.warning_unknown')}
          {timeEstimateId === AppConstants.GAS_TIMES.MAYBE &&
            strings('times_eip1559.warning_low')}
          {timeEstimateId === AppConstants.GAS_TIMES.VERY_LIKELY &&
            strings('times_eip1559.warning_very_likely')}
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
  onHideModal: PropTypes.func,
};

export default TimeEstimateInfoModal;
