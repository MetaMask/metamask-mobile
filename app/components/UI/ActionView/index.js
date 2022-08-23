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

const styles = StyleSheet.create({
  actionContainer: {
    flex: 0,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  button: {
    flex: 1,
  },
  cancel: {
    marginRight: 8,
  },
  confirm: {
    marginLeft: 8,
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
  keyboardShouldPersistTaps = 'never',
  style = undefined,
}) {
  const { colors } = useTheme();

  return (
    <View style={baseStyles.flexGrow}>
      <KeyboardAwareScrollView
        style={[baseStyles.flexGrow, style]}
        resetScrollToCoords={{ x: 0, y: 0 }}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        <TouchableWithoutFeedback
          style={baseStyles.flexGrow}
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
              containerStyle={[styles.button, styles.confirm]}
              disabled={confirmed || confirmDisabled}
            >
              {confirmed ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary.inverse}
                />
              ) : (
                confirmText
              )}
            </StyledButton>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

ActionView.defaultProps = {
  cancelText: strings('action_view.cancel'),
  confirmButtonMode: 'normal',
  confirmText: strings('action_view.confirm'),
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
   * Determines if the keyboard should stay visible after a tap
   */
  keyboardShouldPersistTaps: PropTypes.string,
  /**
   * Optional View styles. Applies to scroll view
   */
  style: PropTypes.object,
};
