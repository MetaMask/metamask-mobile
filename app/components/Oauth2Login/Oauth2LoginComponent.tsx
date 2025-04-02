import React, { View, StyleSheet } from 'react-native';
import StyledButton from '../UI/StyledButton';
import { OnboardingSelectorIDs } from '../../../e2e/selectors/Onboarding/Onboarding.selectors';
import { strings } from '../../../locales/i18n';
import DevLogger from '../../core/SDKConnect/utils/DevLogger';
import { useNavigation, ParamListBase, NavigationProp } from '@react-navigation/native';
import Oauth2LoginService from '../../core/Oauth2Login/Oauth2loginService';
const styles = StyleSheet.create({
  buttonWrapper: {
    marginBottom: 16,
  },
});

export default function Oauth2LoginComponent( ) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  return (
    <>
    <View style={styles.buttonWrapper}>
      <StyledButton
        title="Sign in with Apple"
        type={'normal'}
        testID={OnboardingSelectorIDs.IMPORT_SEED_BUTTON}
        onPress={async () => {
          const result = await Oauth2LoginService.handleOauth2Login('apple', 'onboarding').catch((e) => {
            DevLogger.log(e);
            return {type: 'error', error: e, existingUser: false};
          });

          if (result.type === 'success') {

            if (result.existingUser) {
              navigation.navigate('Login');
            } else {
              navigation.navigate('ChoosePassword');
            }
          }
        }}
      > {strings('login.apple_button')} </StyledButton>
    </View>
    <View style={styles.buttonWrapper}>
      <StyledButton
        title="Sign in with Google"
        type={'normal'}
        testID={OnboardingSelectorIDs.IMPORT_SEED_BUTTON}
        onPress={async () => {
          const result = await Oauth2LoginService.handleOauth2Login('google', 'onboarding').catch((e) => {
            DevLogger.log(e);
            return {type: 'error', error: e, existingUser: false};
          });

          if (result.type === 'success') {
            if (result.existingUser) {
              navigation.navigate('Login');
            } else {
              navigation.navigate('ChoosePassword');
            }
          }
        }}
      > {strings('login.google_button')} </StyledButton>
    </View>
    </>
  );
}

