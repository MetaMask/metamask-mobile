import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  Alert,
  Text,
  View,
  TextInput,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import StyledButton from '../../UI/StyledButton';

import { baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { passwordRequirementsMet } from '../../../util/password';
import { ThemeContext, mockTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
      padding: 16,
    },
    input: {
      borderWidth: 2,
      borderRadius: 5,
      borderColor: colors.border.default,
      padding: 10,
      color: colors.text.default,
    },
    ctaWrapper: {
      marginTop: 10,
    },
    enterPassword: {
      color: colors.text.default,
      fontSize: 16,
      marginBottom: 15,
    },
  });

/**
 * View where users can re-enter their password
 */
export default class EnterPasswordSimple extends PureComponent {
  static propTypes = {
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
  };

  state = {
    password: '',
    loading: false,
    error: null,
  };

  mounted = true;

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('enter_password.title'),
        navigation,
        false,
        colors,
      ),
    );
  };

  componentDidMount = () => {
    this.updateNavBar();
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  onPressConfirm = async () => {
    if (this.state.loading) return;
    if (!passwordRequirementsMet(this.state.password)) {
      Alert.alert(
        strings('enter_password.error'),
        strings('choose_password.password_length_error'),
      );
    } else {
      this.props.route.params.onPasswordSet(this.state.password);
      this.props.navigation.pop();
      return;
    }
  };

  onPasswordChange = (val) => {
    this.setState({ password: val });
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    return (
      <SafeAreaView style={styles.mainWrapper}>
        <View style={styles.wrapper} testID={'enter-password-screen'}>
          <KeyboardAwareScrollView
            style={styles.wrapper}
            resetScrollToCoords={{ x: 0, y: 0 }}
          >
            <View style={baseStyles.flexGrow}>
              <View>
                <Text style={styles.enterPassword}>
                  {strings('enter_password.desc')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={strings('enter_password.password')}
                  placeholderTextColor={colors.text.muted}
                  onChangeText={this.onPasswordChange}
                  secureTextEntry
                  onSubmitEditing={this.onPressConfirm}
                  keyboardAppearance={themeAppearance}
                />
              </View>
              <View style={styles.ctaWrapper}>
                <StyledButton
                  type={'blue'}
                  onPress={this.onPressConfirm}
                  testID={'submit-button'}
                  disabled={
                    !(
                      this.state.password !== '' ||
                      !passwordRequirementsMet(this.state.password)
                    )
                  }
                >
                  {this.state.loading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary.inverse}
                    />
                  ) : (
                    strings('enter_password.confirm_button')
                  )}
                </StyledButton>
              </View>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </SafeAreaView>
    );
  }
}

EnterPasswordSimple.contextType = ThemeContext;
