import React from 'react';
import { StyleSheet } from 'react-native';
import Modal from 'react-native-modal';

import PhishingModalUI from '../../../UI/PhishingModal';
import { colors } from '../../../../styles/common';

const styles = StyleSheet.create({
	fullScreenModal: {
		flex: 1,
	},
});

type CallbackType = (...args: []) => void;
interface PhishingModalProps {
	currentUrl: string;
	go: (url: string, initialCall?: boolean | undefined) => void;
	goBack: CallbackType;
	addToWhitelist: (url: string) => void;
	blockedUrl: string;
	setBlockedUrl: any;
	showPhishingModal: boolean;
	setShowPhishingModal: (value: boolean) => void;
}

const PhishingModal = ({
	currentUrl,
	go,
	goBack,
	addToWhitelist,
	blockedUrl,
	setBlockedUrl,
	showPhishingModal,
	setShowPhishingModal,
}: PhishingModalProps) => {
	/**
	 * Go to eth-phishing-detect page
	 */
	const goToETHPhishingDetector = () => {
		setShowPhishingModal(false);
		go(`https://github.com/metamask/eth-phishing-detect`);
	};

	/**
	 * Continue to phishing website
	 */
	const continueToPhishingSite = () => {
		const urlObj = new URL(blockedUrl);
		addToWhitelist(urlObj.hostname);
		setShowPhishingModal(false);

		blockedUrl !== currentUrl &&
			setTimeout(() => {
				go(blockedUrl);
				setBlockedUrl(undefined);
			}, 1000);
	};

	/**
	 * Go to etherscam website
	 */
	const goToEtherscam = () => {
		setShowPhishingModal(false);
		go(`https://etherscamdb.info/domain/meta-mask.com`);
	};

	/**
	 * Go to eth-phishing-detect issue
	 */
	const goToFilePhishingIssue = () => {
		setShowPhishingModal(false);
		go(`https://github.com/metamask/eth-phishing-detect/issues/new`);
	};

	/**
	 * Go back from phishing website alert
	 */
	const goBackToSafety = () => {
		blockedUrl === currentUrl && goBack();
		setTimeout(() => {
			setShowPhishingModal(false);
			setBlockedUrl(undefined);
		}, 500);
	};

	return (
		<Modal
			isVisible={showPhishingModal}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={styles.fullScreenModal}
			backdropOpacity={1}
			backdropColor={colors.red}
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
