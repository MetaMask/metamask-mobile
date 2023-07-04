import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';
import Alert, { AlertType } from '../../../Base/Alert';
import Text from '../../../Base/Text';
import { SEND_WARNING_MESSAGE } from '../../../../../wdio/screen-objects/testIDs/Screens/SendScreen.testIds';

const styles = StyleSheet.create({
  button: {
    marginTop: 27,
    marginBottom: 12,
  },
  errorMessage: {
    flex: 0,
  },
});

export default function ErrorMessage(props) {
  const { errorMessage, errorContinue, onContinue, isOnlyWarning } = props;
  return (
    <Alert
      type={isOnlyWarning ? AlertType.Info : AlertType.Error}
      testID={SEND_WARNING_MESSAGE}
    >
      {(textStyle) => (
        <View>
          <Text small style={[textStyle, styles.errorMessage]}>
            {errorMessage}
          </Text>
          {errorContinue && (
            <TouchableOpacity onPress={onContinue} style={styles.button}>
              <Text small link centered>
                {strings('transaction.continueError')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Alert>
  );
}

ErrorMessage.propTypes = {
  /**
   * Error message to display, can be a string or a Text component
   */
  errorMessage: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
    PropTypes.string,
  ]),
  /**
   * Show continue button when it is a contract address
   */
  errorContinue: PropTypes.bool,
  /**
   * Function that is called when continue button is pressed
   */
  onContinue: PropTypes.func,
  /**
   * Show a warning info instead of an error
   */
  isOnlyWarning: PropTypes.bool,
};
