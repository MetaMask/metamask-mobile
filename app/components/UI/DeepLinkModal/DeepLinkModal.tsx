import React, { useCallback, useRef, useEffect, useState, memo } from 'react';
import { View, Image, Modal, SafeAreaView } from 'react-native';
import { useDispatch } from 'react-redux';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';

import styleSheet from './DeepLinkModal.styles';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useParams } from '../../../util/navigation/navUtils';
import { useStyles } from '../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import { MetaMetricsEvents, IMetaMetricsEvent } from '../../../core/Analytics';
import Checkbox from '../../../component-library/components/Checkbox';
import { ScrollView } from 'react-native-gesture-handler';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { Box } from '../../../components/UI/Box/Box';
import { setDeepLinkModalDisabled } from '../../../actions/settings';
import { setShowDeepLinkModal } from '../../../actions/modals';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';

import {
  pageNotFound,
  foxLogo,
  ModalImageProps,
  DeepLinkModalProps,
} from './constant';

const ModalImage = memo(({ linkType, styles }: ModalImageProps) => {
  if (linkType === 'invalid') {
    return (
      <View style={styles.pageNotFoundImageContainer}>
        <Image source={pageNotFound} style={styles.pageNotFoundImage} />
      </View>
    );
  }
  return (
    <View style={styles.foxImageContainer}>
      <Image source={foxLogo} style={styles.foxImage} />
    </View>
  );
});
const DeepLinkModal = ({
  visible,
  linkType,
  onContinue,
  pageTitle,
}: {
  visible: boolean;
  linkType: DeepLinkModalProps['linkType'];
  onContinue: () => void;
  pageTitle: string;
}) => {
  //   const pageTitle = linkType !== 'invalid' ? linkType : undefined;
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isChecked, setIsChecked] = useState(false);
  const dispatch = useDispatch();

  const LINK_TYPE_MAP = React.useMemo(
    (): Record<
      DeepLinkModalProps['linkType'],
      {
        title: string;
        description: string;
        checkboxLabel?: string;
        event: IMetaMetricsEvent;
        eventContinue: IMetaMetricsEvent;
        eventGoBack?: IMetaMetricsEvent;
      }
    > => ({
      public: {
        title: strings('deep_link_modal.public_link.title'),
        description: strings('deep_link_modal.public_link.description', {
          pageTitle,
        }),
        event: MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_VIEWED,
        eventContinue:
          MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_CONTINUE_CLICKED,
        eventGoBack: MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_GO_BACK_CLICKED,
      },
      private: {
        title: strings('deep_link_modal.private_link.title'),
        description: strings('deep_link_modal.private_link.description', {
          pageTitle,
        }),
        event: MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_VIEWED,
        eventContinue:
          MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_CONTINUE_CLICKED,
        eventGoBack: MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_GO_BACK_CLICKED,
      },
      invalid: {
        title: strings('deep_link_modal.invalid.title'),
        description: strings('deep_link_modal.invalid.description'),
        event: MetaMetricsEvents.DEEP_LINK_INVALID_MODAL_VIEWED,
        eventContinue:
          MetaMetricsEvents.DEEP_LINK_INVALID_MODAL_CONTINUE_CLICKED,
      },
    }),
    [pageTitle],
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(LINK_TYPE_MAP[linkType].event)
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, linkType, LINK_TYPE_MAP]);

  const dismissModal = (cb?: () => void): Promise<void> => {
    console.log('dismissModal');
    dispatch(setShowDeepLinkModal(false));
    return new Promise((resolve) => {
      if (cb) {
        cb();
      }
      resolve();
    });
  };

  const onBackPressed = useCallback(() => {
    dismissModal(() => {
      const event = LINK_TYPE_MAP[linkType].eventGoBack;
      if (event) {
        trackEvent(
          createEventBuilder(event)
            .addProperties({
              ...generateDeviceAnalyticsMetaData(),
            })
            .build(),
        );
      }
      SharedDeeplinkManager.getInstance().handleUserChoice(false);
    });
  }, [trackEvent, createEventBuilder, linkType, LINK_TYPE_MAP]);

  const onContinuePressed = () => {
    dismissModal(() => {
      trackEvent(
        createEventBuilder(LINK_TYPE_MAP[linkType].eventContinue)
          .addProperties({
            ...generateDeviceAnalyticsMetaData(),
            pageTitle: pageTitle ?? '',
          })
          .build(),
      );
      SharedDeeplinkManager.getInstance().handleUserChoice(true);
    }).then(() => {
      onContinue();
    });
  };

  const onDontRemindMeAgainPressed = useCallback(() => {
    const event = isChecked
      ? MetaMetricsEvents.DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_UNCHECKED
      : MetaMetricsEvents.DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_CHECKED;
    trackEvent(
      createEventBuilder(event)
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
        })
        .build(),
    );
    dispatch(setDeepLinkModalDisabled(!isChecked));
    setIsChecked((prev) => !prev);
  }, [isChecked, trackEvent, createEventBuilder, dispatch]);

  const shouldShowCheckbox = linkType === 'private';
  const primaryButtonLabel =
    linkType === 'invalid'
      ? strings('deep_link_modal.open_metamask_anyway')
      : strings('deep_link_modal.continue_button');
  const shouldRenderSecondaryButton = linkType !== 'invalid';

  return (
    <Modal visible={visible}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.screen}>
          <ScrollView contentContainerStyle={styles.content}>
            <ModalImage linkType={linkType} styles={styles} />
            <Text variant={TextVariant.HeadingLG} style={styles.title}>
              {LINK_TYPE_MAP[linkType].title}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.description}
            >
              {LINK_TYPE_MAP[linkType].description}
            </Text>
          </ScrollView>
          {shouldShowCheckbox && (
            <Box style={styles.checkboxContainer}>
              <Checkbox
                label={strings('deep_link_modal.private_link.checkbox_label')}
                isChecked={isChecked}
                onPress={onDontRemindMeAgainPressed}
              />
            </Box>
          )}
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={primaryButtonLabel}
            onPress={onContinuePressed}
            style={styles.actionButtonMargin}
          />
          {shouldRenderSecondaryButton && (
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('deep_link_modal.back_button')}
              onPress={onBackPressed}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default React.memo(DeepLinkModal);
