import React, { PureComponent } from 'react';
import { View,
  Text,
  StyleSheet,
  Platform,
  Linking } from 'react-native';
import TouchableOpacity from '../../Base/TouchableOpacity';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import URL from 'url-parse';
import { ThemeContext, mockTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { ETHEREUM_DETECTION_TITLE } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/ExternalWebsites.testIds';
import Button from '../../../component-library/components/Buttons/Button/Button';
import {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button/Button.types';

const createStyles = (colors) =>
  StyleSheet.create({
    warningIcon: {
      color: colors.error.default,
      fontSize: 40,
      marginBottom: 20,
    },
    phishingModalWrapper: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
      marginTop: -100,
      backgroundColor: colors.background.alternative,
    },
    phishingModalTitle: {
      ...fontStyles.bold,
      color: colors.text.default,
      fontSize: 24,
      textAlign: 'left',
      marginBottom: 16,
    },
    phishingText: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.default,
      marginBottom: 20,
    },
    link: {
      color: colors.error.default,
      textDecorationLine: 'underline',
    },
    buttonContainer: {
      marginVertical: 8,
      borderRadius: 16,
      backgroundColor: colors.background.default,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors.shadow.default,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    buttonText: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.default,
      marginLeft: 12,
    },
    buttonIcon: {
      color: colors.text.default,
      width: 24,
      textAlign: 'center',
    },
    backToSafetyButton: {
      backgroundColor: colors.primary.default,
      borderRadius: 30,
      padding: 16,
      alignItems: 'center',
      marginTop: 32,
    },
    backToSafetyText: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.primary.default,
    },
    warningContainer: {
      alignItems: 'left',
    },
    buttonWrapper: {
      marginTop: 32,
      height: 48,
    },
  });

export default class PhishingModal extends PureComponent {
  static propTypes = {
    /**
     * name of the blacklisted url
     */
    fullUrl: PropTypes.string,
    /**
     * Called to the user decides to proceed to the phishing site
     */
    continueToPhishingSite: PropTypes.func,
    /**
     * Called to the user decides to report an issue
     */
    goToFilePhishingIssue: PropTypes.func,
    /**
     * Called when the user takes the recommended action
     */
    goBackToSafety: PropTypes.func,
    /**
     * Called to the user decides to share on Twitter
     */
  };

  shareToTwitter = () => {
    const tweetText =
      'MetaMask just protected me from a phishing attack! Remember to always stay vigilant when clicking on links. Learn more at https://metamask.io';
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      tweetText,
    )}`;
    Linking.canOpenURL(twitterUrl).then((supported) => {
      if (supported) {
        Linking.openURL(twitterUrl);
      }
    });
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const urlObj = new URL(this.props.fullUrl);
    const host = urlObj.hostname;

    return (
      <View style={styles.phishingModalWrapper}>
        <View style={styles.warningContainer}>
          <Icon name="warning" style={styles.warningIcon} />
        </View>
        <Text
          style={styles.phishingModalTitle}
          {...generateTestId(Platform, ETHEREUM_DETECTION_TITLE)}
        >
          {strings('phishing.site_might_be_harmful')}
        </Text>
        <Text style={styles.phishingText}>
          {strings('phishing.metamask_flagged_site')}
        </Text>
        <Text style={styles.phishingText}>
          {strings('phishing.you_may_proceed_anyway')}{' '}
          <Text style={styles.link} onPress={this.props.continueToPhishingSite}>
            {strings('phishing.proceed_anyway')}
          </Text>
          , {strings('phishing.but_please_do_so_at_your_own_risk')}
        </Text>
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={this.props.goToFilePhishingIssue}
        >
          <Icon name="flag" size={16} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>
            {strings('phishing.report_detection_problem')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={this.shareToTwitter}
        >
          <Icon name="twitter" size={16} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>
            {strings('phishing.share_on_twitter')}
          </Text>
        </TouchableOpacity>
        <Button
          variant={ButtonVariants.Primary}
          label={strings('phishing.back_to_safety')}
          onPress={this.props.goBackToSafety}
          style={styles.buttonWrapper}
          width={ButtonWidthTypes.Full}
        />
      </View>
    );
  }
}

PhishingModal.contextType = ThemeContext;
