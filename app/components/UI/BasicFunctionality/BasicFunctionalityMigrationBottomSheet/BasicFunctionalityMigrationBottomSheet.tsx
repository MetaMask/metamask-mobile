import React, { useCallback, useEffect, useRef } from 'react';
import { Linking, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';
import {
  Box,
  BottomSheetFooter,
  ButtonSize,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { dismissBasicFunctionalityMigrationNotification } from '../../../../actions/settings';
import { strings } from '../../../../../locales/i18n';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';

export const BASIC_FUNCTIONALITY_MIGRATION_BLOG_POST_LINK =
  'https://metamask.io/news/basic-functionality-profile-setting';
export const BASIC_FUNCTIONALITY_MIGRATION_PRIVACY_NOTICE_LINK =
  'https://metamask.io/privacy-notice';

export const SOCIAL_BF_PRIVACY_NOTICE_NAME = 'social_bf_privacy_notice';

export enum BasicFunctionalitySocialPrivacyNoticeAction {
  VIEWED = 'viewed',
  ACCEPT_AND_CLOSE = 'accept and close',
}

const BasicFunctionalityMigrationBottomSheet = () => {
  const dispatch = useDispatch();
  const sheetRef = useRef<BottomSheetRef>(null);
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const trackSocialPrivacyNotice = useCallback(
    (action: BasicFunctionalitySocialPrivacyNoticeAction) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTICE_UPDATE_DISPLAYED)
          .addProperties({
            name: SOCIAL_BF_PRIVACY_NOTICE_NAME,
            action,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  useEffect(() => {
    trackSocialPrivacyNotice(
      BasicFunctionalitySocialPrivacyNoticeAction.VIEWED,
    );
  }, [trackSocialPrivacyNotice]);

  const handleAccept = () => {
    trackSocialPrivacyNotice(
      BasicFunctionalitySocialPrivacyNoticeAction.ACCEPT_AND_CLOSE,
    );
    sheetRef.current?.onCloseBottomSheet(() => {
      dispatch(dismissBasicFunctionalityMigrationNotification());
    });
  };

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable={false}
      testID="basic-functionality-migration-bottom-sheet"
    >
      <ScrollView>
        <Box twClassName="items-center gap-4 px-6 pt-11 pb-4">
          <Icon name={IconName.ShieldLock} size={IconSize.Xl} />
          <Text variant={TextVariant.HeadingSm}>
            {strings('basic_functionality_migration.social_title')}
          </Text>
        </Box>
        <Box twClassName="px-6 pb-8">
          <Text variant={TextVariant.BodyMd}>
            {strings('basic_functionality_migration.social_body_1')}{' '}
            {strings('basic_functionality_migration.social_body_2_prefix')}{' '}
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.InfoDefault}
              style={tw.style('underline')}
              onPress={() =>
                Linking.openURL(BASIC_FUNCTIONALITY_MIGRATION_BLOG_POST_LINK)
              }
            >
              {strings('basic_functionality_migration.blog_post_link')}
            </Text>
            {strings('basic_functionality_migration.social_body_2_middle')}
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.InfoDefault}
              style={tw.style('underline')}
              onPress={() =>
                Linking.openURL(
                  BASIC_FUNCTIONALITY_MIGRATION_PRIVACY_NOTICE_LINK,
                )
              }
            >
              {strings('basic_functionality_migration.privacy_notice_link')}
            </Text>
            {strings('basic_functionality_migration.social_body_2_suffix')}
          </Text>
        </Box>
      </ScrollView>
      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
          children: strings('basic_functionality_migration.accept_and_close'),
          onPress: handleAccept,
          testID: 'basic-functionality-migration-accept',
        }}
        twClassName="px-6"
      />
    </BottomSheet>
  );
};

export default BasicFunctionalityMigrationBottomSheet;
