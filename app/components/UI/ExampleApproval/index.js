import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import StyledButton from '../StyledButton';
import { StyleSheet, Text, View } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';
import { ThemeContext, mockTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 200,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },
    intro: {
      ...fontStyles.bold,
      textAlign: 'center',
      color: colors.text.default,
      fontSize: Device.isSmallDevice() ? 16 : 20,
      marginBottom: 8,
      marginTop: 16,
    },
    warning: {
      ...fontStyles.thin,
      color: colors.text.default,
      paddingHorizontal: 24,
      marginBottom: 16,
      fontSize: 14,
      width: '100%',
      textAlign: 'center',
    },
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
 * Example approval component
 */
class ExampleApproval extends PureComponent {
  static propTypes = {
    /**
     * Example request data that is immutable
     */
    value: PropTypes.string,
    /**
     * Example request state that will be dynamically updated
     */
    counter: PropTypes.number,
    /**
     * Callback triggered on approval
     */
    onConfirm: PropTypes.func,
    /**
     * Callback triggered on rejection
     */
    onCancel: PropTypes.func,
  };

  render = () => {
    const { value, counter } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.root}>
        <Text style={styles.intro}>Example</Text>
        <Text style={styles.warning}>This is an example modal.</Text>
        <Text style={styles.warning}>Request Data: {value}</Text>
        <Text style={styles.warning}>Request State: {counter}</Text>
        <View style={styles.actionContainer}>
          <StyledButton
            type={'cancel'}
            onPress={this.props.onCancel}
            containerStyle={[styles.button, styles.cancel]}
          >
            Cancel
          </StyledButton>
          <StyledButton
            type={'confirm'}
            onPress={this.props.onConfirm}
            containerStyle={[styles.button, styles.confirm]}
          >
            Approve
          </StyledButton>
        </View>
      </View>
    );
  };
}

const mapStateToProps = (_state) => ({});

ExampleApproval.contextType = ThemeContext;

export default connect(mapStateToProps)(ExampleApproval);
