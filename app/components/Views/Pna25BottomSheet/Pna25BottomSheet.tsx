import React, { useCallback, useEffect, useRef } from 'react';
import { Linking, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import { useMetrics } from '../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Routes from '../../../constants/navigation/Routes';

export enum Pna25BottomSheetAction {
  VIEWED = 'viewed',
  CLOSED = 'closed',
  LEAVE = 'leave',
  OPEN_SETTINGS = 'open settings',
  ACCEPT_AND_CLOSE = 'accept and close',
}

const Pna25BottomSheet = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { trackEvent, createEventBuilder } = useMetrics();

  const handleTrack = useCallback(
    (action: Pna25BottomSheetAction) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTICE_UPDATE_DISPLAYED)
          .addProperties({
            name: 'pna25',
            action,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder],
  );

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleLearnMore = () => {
    Linking.openURL('https://metamask.io/news/updating-metamask-analytics');
  };

  // Track bottom sheet display
  useEffect(() => {
    handleTrack(Pna25BottomSheetAction.VIEWED);
  }, [handleTrack]);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      onClose={() => handleTrack(Pna25BottomSheetAction.LEAVE)}
    >
      <BottomSheetHeader
        onClose={() => {
          handleTrack(Pna25BottomSheetAction.CLOSED);
          handleClose();
        }}
        style={tw.style('pt-0 pb-0')}
      />
      <ScrollView>
        <Box twClassName="flex flex-col items-center gap-4 mb-6">
          <Icon name={IconName.ShieldLock} size={IconSize.Xl} />
          <Text variant={TextVariant.HeadingSm}>
            {strings('privacy_policy.pna25_title')}
          </Text>
        </Box>
        <Box twClassName="px-6 pb-8 gap-6">
          <Text variant={TextVariant.BodyMd}>
            {strings('privacy_policy.pna25_description')}
          </Text>
          <Text variant={TextVariant.BodyMd}>
            {strings('privacy_policy.pna25_description_2')}
          </Text>
          <Text variant={TextVariant.BodyMd}>
            {strings('privacy_policy.pna25_description_3') + ' '}
            <Text
              variant={TextVariant.BodyMd}
              twClassName="underline"
              onPress={handleLearnMore}
            >
              {strings('privacy_policy.pna25_blog_post_link')}
            </Text>
            {'.'}
          </Text>
        </Box>
      </ScrollView>
      <BottomSheetFooter
        buttonPropsArray={[
          {
            variant: ButtonVariants.Secondary,
            label: strings('privacy_policy.pna25_open_settings_button'),
            onPress: () => {
              handleTrack(Pna25BottomSheetAction.OPEN_SETTINGS);
              navigation.navigate(Routes.SETTINGS_VIEW, {
                screen: Routes.SETTINGS.SECURITY_SETTINGS,
              });
            },
          },
          {
            variant: ButtonVariants.Primary,
            label: strings('privacy_policy.pna25_confirm_button'),
            onPress: () => {
              handleTrack(Pna25BottomSheetAction.ACCEPT_AND_CLOSE);
              handleClose();
            },
          },
        ]}
        buttonsAlignment={ButtonsAlignment.Vertical}
        style={tw.style('px-6')}
      />
    </BottomSheet>
  );
};

export default Pna25BottomSheet;
