import React, { PureComponent } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import StyledButton from '../../UI/StyledButton';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import URL from 'url-parse';
import { ThemeContext, mockTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { ETHEREUM_DETECTION_TITLE } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/ExternalWebsites.testIds';

const createStyles = (colors) =>
  StyleSheet.create({
    warningIcon: {
      color: colors.error.default,
      marginRight: 10,
    },
    phishingModalWrapper: {
      paddingHorizontal: 20,
      justifyContent: 'center',
    },
    phishingModalContent: {
      height: 495,
      borderRadius: 4,
      backgroundColor: colors.background.default,
    },
    phishingModalTitle: {
      ...fontStyles.bold,
      color: colors.error.default,
      textAlign: 'center',
    },
    phishingModalHeader: {
      backgroundColor: colors.background.default,
      paddingVertical: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    phishingModalInfo: {
      backgroundColor: colors.background.alternative,
      paddingTop: 20,
      paddingHorizontal: 20,
    },
    phishingModalInfoContent: {
      paddingBottom: 20,
    },
    phishingText: {
      ...fontStyles.normal,
      fontSize: 11,
      color: colors.text.default,
      marginBottom: 15,
    },
    link: {
      textDecorationColor: colors.text.default,
      textDecorationLine: 'underline',
    },
    bold: {
      ...fontStyles.bold,
    },
    phishingFooter: {
      marginTop: 10,
      alignItems: 'flex-end',
    },
    backToSafetyContainer: {
      borderWidth: 0,
      padding: 10,
    },
    backToSafetyText: {
      color: colors.error.default,
      fontSize: 12,
    },
    foxImage: {
      alignSelf: 'center',
      width: 48,
      height: 48,
      marginBottom: -15,
      zIndex: 99999,
    },
  });

const foxImage = require('../../../images/fox.png'); // eslint-disable-line import/no-commonjs

export default class PhishingModal extends PureComponent {
  static propTypes = {
    /**
     * name of the blacklisted url
     */
    fullUrl: PropTypes.string,
    /**
     * called when tapping on "Ethereum Phishing Detector"
     */
    goToETHPhishingDetector: PropTypes.func,
    /**
     * Called to the user decides to proceed to the phishing site
     */
    continueToPhishingSite: PropTypes.func,
    /**
     * Called when the user decides to go to etherscam db website
     */
    goToEtherscam: PropTypes.func,
    /**
     * Called to the user decides to report an issue
     */
    goToFilePhishingIssue: PropTypes.func,
    /**
     * Called when the user takes the recommended action
     */
    goBackToSafety: PropTypes.func,
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const urlObj = new URL(this.props.fullUrl);
    const host = urlObj.hostname;

    return (
      <View style={styles.phishingModalWrapper}>
        <Image
          source={foxImage}
          style={styles.foxImage}
          resizeMethod={'auto'}
        />
        <View style={styles.phishingModalContent}>
          <View style={styles.phishingModalHeader}>
            <Icon name="warning" size={15} style={styles.warningIcon} />
            <Text
              style={styles.phishingModalTitle}
              {...generateTestId(Platform, ETHEREUM_DETECTION_TITLE)}
            >
              {strings('phishing.ethereum_phishing_detection')}
            </Text>
          </View>
          <ScrollView
            style={styles.phishingModalInfo}
            contentContainerStyle={styles.phishingModalInfoContent}
          >
            <Text style={styles.phishingText}>
              <Text style={styles.bold}>{host}</Text>
              {strings('phishing.intro')}
            </Text>
            <Text style={styles.phishingText}>
              {strings('phishing.reasons')}
              <Text
                style={styles.link}
                onPress={this.props.goToETHPhishingDetector}
              >
                {strings('phishing.ethereum_phishing_detector')}
              </Text>
              . {strings('phishing.list_content')}
            </Text>
            <Text style={styles.phishingText}>
              {strings('phishing.to_read_more')}
              <Text style={styles.link} onPress={this.props.goToEtherscam}>
                {strings('phishing.review_on_etherscam')}
              </Text>
            </Text>
            <Text style={styles.phishingText}>
              {strings('phishing.warning')}
              <Text
                style={styles.link}
                onPress={this.props.continueToPhishingSite}
              >
                {strings('phishing.continue_on_your_own')}
              </Text>
            </Text>
            <Text style={styles.phishingText}>
              {strings('phishing.reasons')}
              <Text
                style={styles.link}
                onPress={this.props.goToFilePhishingIssue}
              >
                {strings('phishing.file_an_issue')}
              </Text>
            </Text>
          </ScrollView>
        </View>
        <View style={styles.phishingFooter}>
          <StyledButton
            type={'neutral'}
            onPress={this.props.goBackToSafety}
            style={styles.backToSafetyText}
            containerStyle={styles.backToSafetyContainer}
          >
            {strings('phishing.back_to_safety')}
          </StyledButton>
        </View>
      </View>
    );
  }
}

PhishingModal.contextType = ThemeContext;
