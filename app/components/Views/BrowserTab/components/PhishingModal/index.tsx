import React from 'react';
import PhishingModalUI from '../../../../UI/PhishingModal';
import URLParse from 'url-parse';
import {
  MM_PHISH_DETECT_URL,
  PHISHFORT_BLOCKLIST_ISSUE_URL,
  MM_ETHERSCAN_URL,
  MM_BLOCKLIST_ISSUE_URL,
} from '../../../../../constants/urls';
import Modal from 'react-native-modal';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './styles';
import { BrowserUrlBarRef } from '../../../../UI/BrowserUrlBar/BrowserUrlBar.types';

interface PhishingModalProps {
  blockedUrl?: string;
  showPhishingModal: boolean;
  setShowPhishingModal: (show: boolean) => void;
  setBlockedUrl: (url: string | undefined) => void;
  urlBarRef: React.RefObject<BrowserUrlBarRef>;
  addToWhitelist: (hostname: string) => void;
  activeUrl: string;
  blockListType: React.MutableRefObject<string>;
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
  blockListType,
  goToUrl,
}: PhishingModalProps) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});
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
    blockListType.current === 'MetaMask'
      ? goToUrl(MM_BLOCKLIST_ISSUE_URL)
      : goToUrl(PHISHFORT_BLOCKLIST_ISSUE_URL);
  };

  /**
   * Go back from phishing website alert
   */
  const goBackToSafety = () => {
    urlBarRef.current?.setNativeProps({ text: activeUrl });

    setTimeout(() => {
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
      backdropColor={colors.error.default}
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
