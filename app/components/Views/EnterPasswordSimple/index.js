import React, { useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
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
const EnterPasswordSimple = ({ navigation, route }) => {
  const { colors, themeAppearance } = useContext(ThemeContext) || mockTheme;
  const [password, setPassword] = useState('');

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('enter_password.title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const onPressConfirm = async () => {
    if (!passwordRequirementsMet(password)) {
      Alert.alert(
        strings('enter_password.error'),
        strings('choose_password.password_length_error'),
      );
    } else {
      route.params.onPasswordSet(password);
      navigation.pop();
      return;
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <View style={styles.wrapper}>
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
                onChangeText={setPassword}
                secureTextEntry
                onSubmitEditing={onPressConfirm}
                keyboardAppearance={themeAppearance}
              />
            </View>
            <View style={styles.ctaWrapper}>
              <StyledButton
                type={'blue'}
                onPress={onPressConfirm}
                disabled={
                  !(password !== '' || !passwordRequirementsMet(password))
                }
              >
                {strings('enter_password.confirm_button')}
              </StyledButton>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
};

EnterPasswordSimple.propTypes = {
  /**
   * The navigator object
   */
  navigation: PropTypes.object,
  /**
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
};

export default EnterPasswordSimple;
