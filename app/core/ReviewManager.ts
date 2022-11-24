import React from 'react';
import { Platform, Linking } from 'react-native';
/* eslint-disable-next-line */
import { NavigationContainerRef } from '@react-navigation/core';
import InAppReview from 'react-native-in-app-review';
import DefaultPreference from 'react-native-default-preference';
import { REVIEW_EVENT_COUNT, REVIEW_SHOWN_TIME } from '../constants/storage';
import Logger from '../util/Logger';
import { MM_APP_STORE_LINK, MM_PLAY_STORE_LINK } from '../constants/urls';

const EVENT_THRESHOLD = 6;
const TIME_THRESHOLD = 10519200000; // 4 months in milliseconds
const MM_APP_STORE_DEEPLINK = `${MM_APP_STORE_LINK}?action=write-review`;

class ReviewManager {
  navigationRef?: React.MutableRefObject<NavigationContainerRef>;

  private addEventCount = async () => {
    try {
      const previousCount =
        (await DefaultPreference.get(REVIEW_EVENT_COUNT)) || '0';
      const newCount = parseInt(previousCount) + 1;
      await DefaultPreference.set(REVIEW_EVENT_COUNT, `${newCount}`);
    } catch (error) {
      // Failed to add event count
    }
  };

  private checkReviewCriteria = async () => {
    const isReviewAvailable = InAppReview.isAvailable();
    if (!isReviewAvailable) {
      return false;
    }

    try {
      const eventCount = await DefaultPreference.get(REVIEW_EVENT_COUNT);
      const lastShownTime =
        (await DefaultPreference.get(REVIEW_SHOWN_TIME)) || '0';
      const satisfiedEventCount = parseInt(eventCount) >= EVENT_THRESHOLD;
      const satisfiedTime =
        Date.now() - parseInt(lastShownTime) > TIME_THRESHOLD;
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

  private handlePrompt = async () => {
    try {
      await InAppReview.RequestInAppReview();
    } catch (error) {
      // Failed to prompt review
      this.openMetaMaskReview();
      Logger.log('Falling back to MM review prompt', error);
    } finally {
      // Reset criteria
      this.resetReviewCriteria();
    }
  };

  private openMetaMaskReview = () => {
    this.navigationRef?.current?.navigate('ReviewModal');
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
    this.handlePrompt();
  };

  openFallbackStoreReview = async () => {
    const storeDeepLink =
      Platform.select({
        ios: MM_APP_STORE_DEEPLINK,
        android: MM_PLAY_STORE_LINK,
      }) || '';
    try {
      await Linking.openURL(storeDeepLink);
    } catch (error) {
      // Failed to open store review
    }
  };
}

export default new ReviewManager();
