import React from 'react';
import { Platform, Linking } from 'react-native';
/* eslint-disable-next-line */
import { NavigationContainerRef } from '@react-navigation/core';
import InAppReview from 'react-native-in-app-review';
import DefaultPreference from 'react-native-default-preference';
import { REVIEW_EVENT_COUNT, REVIEW_SHOWN_TIME } from '../constants/storage';
import AppConstants from './AppConstants';

const EVENT_THRESHOLD = 10;
const TIME_THRESHOLD = 10_519_200_000; // 4 months in milliseconds

class ReviewManager {
	navigationRef?: React.MutableRefObject<NavigationContainerRef>;

	private addEventCount = async () => {
		try {
			const previousCount = (await DefaultPreference.get(REVIEW_EVENT_COUNT)) || '0';
			const newCount = parseInt(previousCount) + 1;
			await DefaultPreference.set(REVIEW_EVENT_COUNT, `${newCount}`);
		} catch (error) {
			// Failed to add event count
		}
	};

	private openFallbackStoreReview = async () => {
		const storeDeepLink =
			Platform.select({
				ios: `itms-apps://apps.apple.com/app/id${AppConstants.BUNDLE_IDS.IOS}?action=write-review`,
				android: `market://details?id=${AppConstants.BUNDLE_IDS.ANDROID}`,
			}) || '';
		try {
			await Linking.openURL(storeDeepLink);
		} catch (error) {
			// Failed to open store review
		}
	};

	private checkReviewCriteria = async () => {
		const isReviewAvailable = InAppReview.isAvailable();
		if (!isReviewAvailable) {
			return false;
		}

		try {
			const eventCount = await DefaultPreference.get(REVIEW_EVENT_COUNT);
			const lastShownTime = (await DefaultPreference.get(REVIEW_SHOWN_TIME)) || '0';
			const satisfiedEventCount = parseInt(eventCount) >= EVENT_THRESHOLD;
			const satisfiedTime = Date.now() - parseInt(lastShownTime) > TIME_THRESHOLD;
			return satisfiedEventCount && satisfiedTime;
		} catch (error) {
			return false;
		}
	};

	private resetReviewCriteria = async () => {
		try {
			const currentUnixTime = Date.now();
			await DefaultPreference.set(REVIEW_EVENT_COUNT, '0');
			await DefaultPreference.set(REVIEW_SHOWN_TIME, `${currentUnixTime}`);
		} catch (error) {
			// Failed to reset criteria
		}
	};

	private handleIosPrompt = () => {
		this.promptNativeReview();
	};

	private handleAndroidPrompt = () => {
		this.navigationRef?.current?.navigate('ReviewModal');
	};

	promptNativeReview = async () => {
		try {
			await InAppReview.RequestInAppReview();
		} catch (error) {
			// Failed to prompt review
			this.openFallbackStoreReview();
		} finally {
			// Reset criteria
			this.resetReviewCriteria();
		}
	};

	promptReview = async () => {
		// 1. Add event count
		await this.addEventCount();

		// 2. Check criteria
		const shouldShowReview = await this.checkReviewCriteria();
		if (!shouldShowReview) {
			return;
		}

		// 3. Handle prompt
		if (Platform.OS === 'ios') {
			this.handleIosPrompt();
		} else {
			this.handleAndroidPrompt();
		}
	};
}

export default new ReviewManager();
