import React from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Modal from 'react-native-modal';
import { baseStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      width: '100%',
    },
    modalView: {
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: colors.background.default,
      width: '90%',
      borderRadius: 6,
      minHeight: 200,
      padding: 15,
    },
    loader: {
      marginTop: 30,
    },
  });

/**
 * View that renders an action modal
 */
export default function BlockingActionModal({
  children,
  modalVisible,
  isLoadingAction,
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Modal
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      isVisible={modalVisible}
      style={styles.modal}
    >
      <View style={styles.modalView}>
        <View style={baseStyles.flexGrow}>
          {children}
          {isLoadingAction && (
            <ActivityIndicator style={styles.loader} size={'small'} />
          )}
        </View>
      </View>
    </Modal>
  );
}

BlockingActionModal.propTypes = {
  /**
   * Whether modal is shown
   */
  modalVisible: PropTypes.bool,
  /**
   * Whether a spinner is shown
   */
  isLoadingAction: PropTypes.bool,
  /**
   * Content to display above the action buttons
   */
  children: PropTypes.node,
};
