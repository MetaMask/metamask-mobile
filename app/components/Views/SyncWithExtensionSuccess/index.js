import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  Animated,
  BackHandler,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import StyledButton from '../../UI/StyledButton';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import setOnboardingWizardStep from '../../../actions/wizard';
import { connect } from 'react-redux';
import Confetti from '../../UI/Confetti';
import { ONBOARDING_WIZARD } from '../../../constants/storage';
import DefaultPreference from 'react-native-default-preference';

const styles = StyleSheet.create({
  mainWrapper: {
    backgroundColor: colors.white,
    flex: 1,
  },
  wrapper: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    marginTop: 20,
    marginBottom: 10,
    color: colors.fontPrimary,
    justifyContent: 'center',
    textAlign: 'center',
    ...fontStyles.bold,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    color: colors.fontPrimary,
    ...fontStyles.normal,
  },
  bold: {
    ...fontStyles.bold,
  },
  button: {
    marginTop: 40,
    flex: 1,
  },
  check: {
    fontSize: 45,
  },
  passwordTipContainer: {
    padding: 16,

    borderWidth: 1,
    borderRadius: 8,
    marginTop: 29,
  },
  passwordTipText: {
    fontSize: 12,
    lineHeight: 17,
  },
  learnMoreText: {
    marginTop: 29,
    textAlign: 'center',
    fontSize: 16,
    ...fontStyles.normal,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  hitSlopLearnMore: {
    top: 10,
    left: 10,
    bottom: 10,
    right: 10,
  },
});

const hardwareBackPress = () => ({});
const HARDWARE_BACK_PRESS = 'hardwareBackPress';

/**
 * View that shows the success message once
 * the sync with the extension is complete
 */
class SyncWithExtensionSuccess extends PureComponent {
  static propTypes = {
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * Action to set onboarding wizard step
     */
    setOnboardingWizardStep: PropTypes.func,
  };

  static navigationOptions = ({ navigation, route }) => ({
    ...getOnboardingNavbarOptions(navigation, route),
    headerLeft: () => <View />,
  });

  iconSpringVal = new Animated.Value(0.4);

  componentWillUnmount = () => {
    BackHandler.removeEventListener(HARDWARE_BACK_PRESS, hardwareBackPress);
  };

  componentDidMount() {
    this.animateIcon();
    BackHandler.addEventListener(HARDWARE_BACK_PRESS, hardwareBackPress);
  }

  animateIcon() {
    Animated.spring(this.iconSpringVal, {
      toValue: 1,
      friction: 2,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }

  continue = async () => {
    // Get onboarding wizard state
    const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
    if (onboardingWizard) {
      this.props.navigation.navigate('HomeNav');
    } else {
      this.props.setOnboardingWizardStep(1);
      this.props.navigation.navigate('HomeNav', { screen: 'WalletView' });
    }
  };

  learnMore = () => {
    this.props.navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://metamask.zendesk.com/hc/en-us/articles/360015489591-Basic-Safety-Tips',
        title: strings('drawer.metamask_support'),
      },
    });
  };

  render = () => (
    <SafeAreaView style={styles.mainWrapper}>
      <Confetti />
      <ScrollView
        contentContainerStyle={styles.wrapper}
        testID={'sync-with-extension-screen'}
      >
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [{ scale: this.iconSpringVal }],
            },
          ]}
        >
          <Text style={styles.check}>✅</Text>
        </Animated.View>
        <Text style={styles.title}>
          {strings('sync_with_extension_success.title')}
        </Text>
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            {strings('sync_with_extension_success.sync_complete_1')}{' '}
            <Text style={styles.bold}>
              {strings('sync_with_extension_success.sync_complete_2')}
            </Text>
          </Text>
          <TouchableOpacity
            onPress={this.learnMore}
            hitSlop={styles.hitSlopLearnMore}
          >
            <Text style={styles.learnMoreText}>
              {strings('sync_with_extension_success.learn_more')}
            </Text>
          </TouchableOpacity>
          <View style={styles.passwordTipContainer}>
            <Text style={styles.passwordTipText}>
              {strings('sync_with_extension_success.password_tip')}
            </Text>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <StyledButton
            type="blue"
            onPress={this.continue}
            containerStyle={styles.button}
          >
            {strings('sync_with_extension_success.button_continue')}
          </StyledButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

export default connect(null, mapDispatchToProps)(SyncWithExtensionSuccess);
