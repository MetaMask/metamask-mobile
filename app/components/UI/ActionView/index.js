import React from 'react';
import StyledButton from '../StyledButton';
import PropTypes from 'prop-types';
import {
  Keyboard,
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from '../../../util/theme';

export const ConfirmButtonState = {
  Error: 'error',
  Warning: 'warning',
  Normal: 'normal',
};

const getStyles = (colors) =>
  StyleSheet.create({
    actionView: {
      flexDirection: 'column',
      flex: 1,
      height: '100%',
    },
    container: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
    actionContainer: {
      width: '100%',
      paddingVertical: 16,
      flexDirection: 'column',
      justifyContent: 'flex-end',
    },
    button: {
      flexDirection: 'column',
      justifyContent: 'flex-end',
      flex: 1,
    },
    cancel: {
      marginRight: 8,
    },
    confirm: {
      marginTop: 'auto',
      marginLeft: 8,
      backgroundColor: colors.primary.default,
    },
    confirmButtonError: {
      backgroundColor: colors.error.default,
      borderColor: colors.error.default,
    },
    confirmButtonWarning: {
      backgroundColor: colors.warning.default,
      borderColor: colors.warning.default,
    },
  });

/**
 * PureComponent that renders scrollable content above configurable buttons
 */
export default function ActionView({
  cancelTestID,
  confirmTestID,
  cancelText,
  children,
  confirmText,
  confirmButtonMode,
  onCancelPress,
  onConfirmPress,
  onTouchablePress,
  showCancelButton,
  showConfirmButton,
  confirmed,
  confirmDisabled,
  loading = false,
  keyboardShouldPersistTaps = 'never',
  style = undefined,
  confirmButtonState = ConfirmButtonState.Normal,
  scrollViewTestID,
}) {
  const { colors } = useTheme();
  confirmText = confirmText || strings('action_view.confirm');
  cancelText = cancelText || strings('action_view.cancel');
  const styles = getStyles(colors);

  return (
    <View style={[baseStyles.flexGrow, styles.actionView]}>
      <KeyboardAwareScrollView
        style={[baseStyles.flexGrow, style, styles.actionView]}
        resetScrollToCoords={{ x: 0, y: 0 }}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        testID={scrollViewTestID}
      >
        <View style={styles.container}>
          <TouchableWithoutFeedback
            style={[baseStyles.flexGrow, styles.actionView]}
            // eslint-disable-next-line react/jsx-no-bind
            onPress={() => {
              if (keyboardShouldPersistTaps === 'handled') {
                Keyboard.dismiss();
              }
              onTouchablePress && onTouchablePress();
            }}
          >
            {children}
          </TouchableWithoutFeedback>

          <View style={styles.actionContainer}>
            {showCancelButton && (
              <StyledButton
                testID={cancelTestID}
                type={confirmButtonMode === 'sign' ? 'signingCancel' : 'cancel'}
                onPress={onCancelPress}
                containerStyle={[styles.button, styles.cancel]}
                disabled={confirmed}
              >
                {cancelText}
              </StyledButton>
            )}
            {showConfirmButton && (
              <StyledButton
                testID={confirmTestID}
                type={confirmButtonMode}
                onPress={onConfirmPress}
                containerStyle={[
                  styles.button,
                  styles.confirm,
                  confirmButtonState === ConfirmButtonState.Error
                    ? styles.confirmButtonError
                    : {},
                  confirmButtonState === ConfirmButtonState.Warning
                    ? styles.confirmButtonWarning
                    : {},
                ]}
                disabled={confirmed || confirmDisabled || loading}
              >
                {confirmed || loading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary.default}
                  />
                ) : (
                  confirmText
                )}
              </StyledButton>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

ActionView.defaultProps = {
  cancelText: '',
  confirmButtonMode: 'normal',
  confirmText: '',
  confirmTestID: '',
  confirmed: false,
  cancelTestID: '',
  showCancelButton: true,
  showConfirmButton: true,
};

ActionView.propTypes = {
  /**
   * TestID for the cancel button
   */
  cancelTestID: PropTypes.string,
  /**
   * TestID for the confirm button
   */
  confirmTestID: PropTypes.string,
  /**
   * Text to show in the cancel button
   */
  cancelText: PropTypes.string,
  /**
   * Content to display above the action buttons
   */
  children: PropTypes.node,
  /**
   * Type of button to show as the confirm button
   */
  confirmButtonMode: PropTypes.oneOf(['normal', 'confirm', 'sign']),
  /**
   * Text to show in the confirm button
   */
  confirmText: PropTypes.string,
  /**
   * Whether action view was confirmed in order to block any other interaction
   */
  confirmed: PropTypes.bool,
  /**
   * Whether action view confirm button should be disabled
   */
  confirmDisabled: PropTypes.bool,
  /**
   * Called when the cancel button is clicked
   */
  onCancelPress: PropTypes.func,
  /**
   * Called when the confirm button is clicked
   */
  onConfirmPress: PropTypes.func,
  /**
   * Called when the touchable without feedback is clicked
   */
  onTouchablePress: PropTypes.func,

  /**
   * Whether cancel button is shown
   */
  showCancelButton: PropTypes.bool,
  /**
   * Whether confirm button is shown
   */
  showConfirmButton: PropTypes.bool,
  /**
   * Loading after confirm
   */
  loading: PropTypes.bool,
  /**
   * Determines if the keyboard should stay visible after a tap
   */
  keyboardShouldPersistTaps: PropTypes.string,
  /**
   * Optional View styles. Applies to scroll view
   */
  style: PropTypes.object,
  /**
   * Optional Confirm button state - this can be Error/Warning/Normal.
   */
  confirmButtonState: PropTypes.string,

  /**
   * Optional TestID for the parent scroll View
   */
  scrollViewTestID: PropTypes.string,
};
