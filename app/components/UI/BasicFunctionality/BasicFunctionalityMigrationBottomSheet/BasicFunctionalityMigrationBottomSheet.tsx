import React, { useRef } from 'react';
import { Linking, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';
import {
  Box,
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
import BottomSheetFooter from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import { dismissBasicFunctionalityMigrationNotification } from '../../../../actions/settings';
import { strings } from '../../../../../locales/i18n';

export const BASIC_FUNCTIONALITY_MIGRATION_BLOG_POST_LINK =
  'https://metamask.io/news/updating-metamask-analytics';
export const BASIC_FUNCTIONALITY_MIGRATION_PRIVACY_NOTICE_LINK =
  'https://consensys.io/privacy-notice';

const BasicFunctionalityMigrationBottomSheet = () => {
  const dispatch = useDispatch();
  const sheetRef = useRef<BottomSheetRef>(null);
  const tw = useTailwind();

  const handleAccept = () => {
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
        <Box twClassName="items-center gap-4 px-6 pb-6">
          <Icon name={IconName.ShieldLock} size={IconSize.Xl} />
          <Text variant={TextVariant.HeadingSm}>
            {strings('basic_functionality_migration.social_title')}
          </Text>
        </Box>
        <Box twClassName="gap-6 px-6 pb-8">
          <Text variant={TextVariant.BodyMd}>
            {strings('basic_functionality_migration.social_body_1')}
          </Text>
          <Text variant={TextVariant.BodyMd}>
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
        buttonPropsArray={[
          {
            variant: ButtonVariants.Primary,
            label: strings('basic_functionality_migration.accept_and_close'),
            onPress: handleAccept,
            testID: 'basic-functionality-migration-accept',
          },
        ]}
        style={tw.style('px-6')}
      />
    </BottomSheet>
  );
};

export default BasicFunctionalityMigrationBottomSheet;
