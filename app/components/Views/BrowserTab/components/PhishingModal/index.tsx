import React, { useEffect } from 'react';
import PhishingModalUI from '../../../../UI/PhishingModal';
import URLParse from 'url-parse';
import {
  MM_PHISH_DETECT_URL,
  MM_ETHERSCAN_URL,
  MM_BLOCKLIST_ISSUE_URL,
} from '../../../../../constants/urls';
import { HOMEPAGE_URL } from '../../constants';
import Modal from 'react-native-modal';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './styles';
import { BrowserUrlBarRef } from '../../../../UI/BrowserUrlBar/BrowserUrlBar.types';
import { useMetrics } from '../../../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

interface PhishingModalProps {
  blockedUrl?: string;
  showPhishingModal: boolean;
  setShowPhishingModal: (show: boolean) => void;
  setBlockedUrl: (url: string | undefined) => void;
  urlBarRef: React.RefObject<BrowserUrlBarRef>;
  addToWhitelist: (hostname: string) => void;
  activeUrl: string;
  goToUrl: (url: string) => void;
}

const PhishingModal = ({
  blockedUrl,
  showPhishingModal,
  setShowPhishingModal,
  setBlockedUrl,
  urlBarRef,
  addToWhitelist,
  activeUrl,
  goToUrl,
}: PhishingModalProps) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();

  useEffect(() => {
    if (showPhishingModal && blockedUrl) {
      const hostname = blockedUrl ? new URL(blockedUrl).hostname : '';
      trackEvent(
        createEventBuilder(MetaMetricsEvents.PHISHING_PAGE_DISPLAYED)
          .addProperties({
            url: hostname,
            reason: 'blocklist',
          })
          .build(),
      );
    }
  }, [showPhishingModal, blockedUrl, trackEvent, createEventBuilder]);

  /**
   * Go to eth-phishing-detect page
   */
  const goToETHPhishingDetector = () => {
    setShowPhishingModal(false);
    goToUrl(MM_PHISH_DETECT_URL);
  };

  /**
   * Continue to phishing website
   */
  const continueToPhishingSite = () => {
    if (!blockedUrl) return;
    const hostname = blockedUrl ? new URL(blockedUrl).hostname : '';
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PROCEED_ANYWAY_CLICKED)
        .addProperties({
          url: hostname,
        })
        .build(),
    );
    const { origin: urlOrigin } = new URLParse(blockedUrl);

    addToWhitelist(urlOrigin);
    setShowPhishingModal(false);

    blockedUrl !== activeUrl &&
      setTimeout(() => {
        goToUrl(blockedUrl);
        setBlockedUrl(undefined);
      }, 1000);
  };

  /**
   * Go to etherscam websiter
   */
  const goToEtherscam = () => {
    setShowPhishingModal(false);
    goToUrl(MM_ETHERSCAN_URL);
  };

  /**
   * Go to eth-phishing-detect issue
   */
  const goToFilePhishingIssue = () => {
    setShowPhishingModal(false);
    goToUrl(MM_BLOCKLIST_ISSUE_URL);
  };

  /**
   * Go back from phishing website alert
   */
  const goBackToSafety = () => {
    urlBarRef.current?.setNativeProps({ text: HOMEPAGE_URL });
    setTimeout(() => {
      goToUrl(HOMEPAGE_URL);
      setShowPhishingModal(false);
      setBlockedUrl(undefined);
    }, 500);
  };

  if (!showPhishingModal) return null;

  return (
    <Modal
      isVisible={showPhishingModal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.fullScreenModal}
      backdropOpacity={1}
      backdropColor={colors.background.alternative}
      animationInTiming={300}
      animationOutTiming={300}
      useNativeDriver
    >
      <PhishingModalUI
        fullUrl={blockedUrl}
        goToETHPhishingDetector={goToETHPhishingDetector}
        continueToPhishingSite={continueToPhishingSite}
        goToEtherscam={goToEtherscam}
        goToFilePhishingIssue={goToFilePhishingIssue}
        goBackToSafety={goBackToSafety}
      />
    </Modal>
  );
};

export default PhishingModal;
