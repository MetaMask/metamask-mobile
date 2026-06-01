import React from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { strings } from '../../../../../../../locales/i18n';
import Alert, { AlertType } from '../../../../../Base/Alert';
import Text from '../../../../../Base/Text';
import { CommonSelectorsIDs } from '../../../../../../util/Common.testIds';

import Pressable from '../../../../../../component-library/components-temp/Pressable';
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
    <Alert type={isOnlyWarning ? AlertType.Info : AlertType.Error}>
      {(textStyle) => (
        <View>
          <Text
            small
            style={[textStyle, styles.errorMessage]}
            testID={CommonSelectorsIDs.ERROR_MESSAGE}
          >
            {errorMessage}
          </Text>
          {errorContinue && (
            <Pressable onPress={onContinue} style={styles.button}>
              <Text small link centered>
                {strings('transaction.continueError')}
              </Text>
            </Pressable>
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
