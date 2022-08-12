import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import AppConstants from '../../../core/AppConstants';
import { strings } from '../../../../locales/i18n';
import ReviewManager from '../../../core/ReviewManager';
import { createStyles } from './styles';
import { useTheme } from '../../../util/theme';

interface HelpOption {
  label: string;
  link: string;
}

const helpOptions: HelpOption[] = [
  {
    label: strings('review_prompt.high_fees'),
    link: AppConstants.REVIEW_PROMPT.HIGH_GAS_FEES,
  },
  {
    label: strings('review_prompt.missing_tokens'),
    link: AppConstants.REVIEW_PROMPT.MISSING_TOKENS,
  },
  {
    label: strings('review_prompt.swap_issues'),
    link: AppConstants.REVIEW_PROMPT.SWAP_ISSUES,
  },
];

/* eslint-disable-next-line */
const foxImage = require('images/fox.png');

const ReviewModal = () => {
  const navigation = useNavigation();
  const modalRef = useRef<ReusableModalRef>(null);
  const [showHelpOptions, setShowHelpOptions] = useState(false);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const dismissModal = (cb?: () => void) => modalRef?.current?.dismissModal(cb);

  const triggerClose = () => dismissModal();

  const triggerShowReviewPrompt = async () => {
    dismissModal();
    ReviewManager.openFallbackStoreReview();
  };

  const triggerShowHelpOptions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowHelpOptions(true);
  };

  const openUrl = useCallback(
    async (url: string) => {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: { url },
      });
    },
    [navigation],
  );

  const renderReviewContent = () => (
    <View style={styles.contentContainer}>
      <Image style={styles.fox} source={foxImage} />
      <Text style={styles.questionLabel}>
        {strings('review_prompt.mobile_sentiment')}
      </Text>
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.option}
          onPress={triggerShowReviewPrompt}
        >
          <Text style={styles.optionIcon}>
            {strings('review_prompt.sentiment_good_face')}
          </Text>
          <Text style={styles.optionLabel}>
            {strings('review_prompt.sentiment_good')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.option}
          onPress={triggerShowHelpOptions}
        >
          <Text style={styles.optionIcon}>
            {strings('review_prompt.sentiment_bad_face')}
          </Text>
          <Text style={[styles.optionLabel, styles.optionLabelRed]}>
            {strings('review_prompt.sentiment_bad')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHelpContent = useCallback(
    () => (
      <View style={styles.contentContainer}>
        <Text style={styles.questionLabel}>
          {strings('review_prompt.help_title')}
        </Text>
        <Text style={styles.description}>
          {strings('review_prompt.help_description_1')}
          <Text
            onPress={() => openUrl(AppConstants.REVIEW_PROMPT.SUPPORT)}
            style={styles.contactLabel}
            suppressHighlighting
          >
            {strings('review_prompt.help_description_2')}
          </Text>
          {strings('review_prompt.help_description_3')}
        </Text>
        {helpOptions.map(({ label, link }, index) => {
          const key = `help-${index}`;
          const onPress = () => openUrl(link);
          return (
            <TouchableOpacity key={key} onPress={onPress}>
              <Text style={[styles.optionLabel, styles.helpOption]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ),
    [openUrl, styles],
  );

  const renderContent = () => {
    if (showHelpOptions) {
      return renderHelpContent();
    }
    return renderReviewContent();
  };

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={styles.modal}>
        {renderContent()}
        <TouchableOpacity
          style={styles.closeButton}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          onPress={triggerClose}
        >
          <Icon color={colors.text.default} size={20} name={'x'} />
        </TouchableOpacity>
      </View>
    </ReusableModal>
  );
};

export default ReviewModal;
