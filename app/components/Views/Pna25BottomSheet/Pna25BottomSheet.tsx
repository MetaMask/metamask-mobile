import React, { useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useDispatch } from 'react-redux';
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
import { storePna25Acknowledged } from '../../../actions/legalNotices';

export enum Pna25BottomSheetAction {
  VIEWED = 'viewed',
  CLOSED = 'closed',
  LEAVE = 'leave',
  OPEN_SETTINGS = 'open settings',
  ACCEPT_AND_CLOSE = 'accept and close',
}

const Pna25BottomSheet = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { trackEvent, createEventBuilder } = useMetrics();

  const handleAction = useCallback(
    (action: Pna25BottomSheetAction) => {
      if (action !== Pna25BottomSheetAction.VIEWED) {
        dispatch(storePna25Acknowledged());
      }

      // Don't emit events for the default close action to avoid double tracking
      if (action === Pna25BottomSheetAction.LEAVE) {
        return;
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTICE_UPDATE_DISPLAYED)
          .addProperties({
            name: 'pna25',
            action,
          })
          .build(),
      );
    },
    [dispatch, trackEvent, createEventBuilder],
  );

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleLearnMore = () => {
    Linking.openURL('https://metamask.io/news/updating-metamask-analytics');
  };

  // Track bottom sheet display
  useEffect(() => {
    handleAction(Pna25BottomSheetAction.VIEWED);
  }, [handleAction]);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      onClose={() => handleAction(Pna25BottomSheetAction.LEAVE)}
    >
      <BottomSheetHeader
        onClose={() => {
          handleAction(Pna25BottomSheetAction.CLOSED);
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
              handleAction(Pna25BottomSheetAction.OPEN_SETTINGS);
              navigation.navigate(Routes.SETTINGS_VIEW, {
                screen: Routes.SETTINGS.SECURITY_SETTINGS,
              });
            },
          },
          {
            variant: ButtonVariants.Primary,
            label: strings('privacy_policy.pna25_confirm_button'),
            onPress: () => {
              handleAction(Pna25BottomSheetAction.ACCEPT_AND_CLOSE);
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
