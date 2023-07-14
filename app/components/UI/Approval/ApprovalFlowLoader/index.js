import React from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import Device from '../../../../util/device';
import { useTheme } from '../../../../util/theme';
import Text from '../../../Base/Text';
import Spinner from '../../AnimatedSpinner';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      minHeight: 100,
    },
    spinnerWrapper: {
      alignItems: 'center',
      marginVertical: 12,
    },
    text: {
      lineHeight: 20,
      paddingHorizontal: 24,
      fontSize: 13,
      width: '100%',
    },
  });

const ApprovalFlowLoader = ({ loadingText }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.root}>
      <View style={styles.spinnerWrapper}>
        <Spinner />
      </View>
      <Text primary centered noMargin style={styles.text}>
        {loadingText}
      </Text>
    </View>
  );
};

ApprovalFlowLoader.propTypes = {
  /**
   * Text that will be displayed while the approval flow modal is active
   */
  loadingText: PropTypes.string,
};

export default ApprovalFlowLoader;
