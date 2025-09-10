import React, {
  useCallback,
  useRef,
  useEffect,
  useState,
  memo,
  useMemo,
} from 'react';
import {
  View,
  Image,
  Linking,
  Pressable,
  Platform,
  ImageStyle,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
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
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Routes from '../../../constants/navigation/Routes';
import { MM_APP_STORE_LINK, MM_PLAY_STORE_LINK } from '../../../constants/urls';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { pageNotFound, foxLogo } from './constant';
import {
  DeepLinkModalLinkType,
  DeepLinkModalParams,
  ModalImageProps,
} from './types';

const ModalImage = memo<ModalImageProps>(({ linkType, styles }) => {
  if (linkType === DeepLinkModalLinkType.INVALID) {
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

const ModalDescription = memo<{
  linkType: DeepLinkModalLinkType;
  description: string;
  onOpenMetaMaskStore: () => void;
  styles: Record<string, ImageStyle & ViewStyle & TextStyle>;
}>(({ linkType, description, onOpenMetaMaskStore, styles }) => {
  const updateToStoreLink = strings(
    'deep_link_modal.invalid.update_to_store_link',
  );
  const wellTakeYouToRightPlace = strings(
    'deep_link_modal.invalid.well_take_you_to_right_place',
  );

  return (
    <View style={styles.description}>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.description}
      >
        {description}
      </Text>
      {linkType === DeepLinkModalLinkType.INVALID && (
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.storeLinkContainer}
        >
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Primary}
            style={styles.storeLink}
            onPress={onOpenMetaMaskStore}
          >
            {updateToStoreLink}
          </Text>
          {wellTakeYouToRightPlace}
        </Text>
      )}
    </View>
  );
});

const DeepLinkModal = () => {
  const params = useParams<DeepLinkModalParams>();
  const { linkType, onBack } = params;
  const navigation = useNavigation();

  const pageTitle =
    params.linkType !== DeepLinkModalLinkType.INVALID
      ? params.pageTitle
      : undefined;
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const bottomSheetRef = useRef<BottomSheetRef | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const dispatch = useDispatch();

  const LINK_TYPE_MAP = useMemo(
    (): Record<
      DeepLinkModalLinkType,
      {
        title: string;
        description: string;
        checkboxLabel?: string;
        buttonLabel?: string;
        event: IMetaMetricsEvent;
        eventContinue?: IMetaMetricsEvent;
        eventDismiss: IMetaMetricsEvent;
      }
    > => ({
      [DeepLinkModalLinkType.PUBLIC]: {
        title: strings('deep_link_modal.public_link.title'),
        description: strings('deep_link_modal.public_link.description', {
          pageTitle,
        }),
        event: MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_VIEWED,
        eventContinue:
          MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_CONTINUE_CLICKED,
        eventDismiss: MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_DISMISSED,
      },
      [DeepLinkModalLinkType.PRIVATE]: {
        title: strings('deep_link_modal.private_link.title'),
        description: strings('deep_link_modal.private_link.description', {
          pageTitle,
        }),
        event: MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_VIEWED,
        eventContinue:
          MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_CONTINUE_CLICKED,
        eventDismiss: MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_DISMISSED,
      },
      [DeepLinkModalLinkType.INVALID]: {
        title: strings('deep_link_modal.invalid.title'),
        description: strings('deep_link_modal.invalid.description'),
        buttonLabel: strings('deep_link_modal.go_to_home_button'),
        event: MetaMetricsEvents.DEEP_LINK_INVALID_MODAL_VIEWED,
        eventDismiss: MetaMetricsEvents.DEEP_LINK_INVALID_MODAL_DISMISSED,
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

  const dismissModal = (cb?: () => void): void =>
    bottomSheetRef?.current?.onCloseBottomSheet(cb);

  const onDimiss = useCallback(() => {
    dismissModal(() => {
      const event = LINK_TYPE_MAP[linkType].eventDismiss;
      trackEvent(
        createEventBuilder(event)
          .addProperties({
            ...generateDeviceAnalyticsMetaData(),
          })
          .build(),
      );
      onBack?.();
    });
  }, [trackEvent, createEventBuilder, linkType, LINK_TYPE_MAP, onBack]);

  const openMetaMaskStore = useCallback(() => {
    // Open appropriate store based on platform
    const storeUrl =
      Platform.OS === 'ios' ? MM_APP_STORE_LINK : MM_PLAY_STORE_LINK;
    Linking.openURL(storeUrl).catch((error) => {
      console.warn('Error opening MetaMask store:', error);
      if (__DEV__) {
        console.warn(`💡 Note: This error is expected in iOS Simulator
   because itms-apps:// URLs require the App Store app
   which is not available in the simulator.
   Test on a real device to verify App Store opening works correctly.`);
      }
    });
  }, []);

  const onPrimaryButtonPressed = useCallback(() => {
    dismissModal(() => {
      if (linkType === DeepLinkModalLinkType.INVALID) {
        // Navigate to home page for invalid links
        navigation.navigate(Routes.WALLET.HOME, {
          screen: Routes.WALLET.TAB_STACK_FLOW,
          params: {
            screen: Routes.WALLET_VIEW,
          },
        });
        params.onBack();
      } else {
        // Track analytics for valid links
        const eventContinue = LINK_TYPE_MAP[linkType].eventContinue;
        if (eventContinue) {
          trackEvent(
            createEventBuilder(eventContinue)
              .addProperties({
                ...generateDeviceAnalyticsMetaData(),
                pageTitle,
              })
              .build(),
          );
        }
        params.onContinue();
      }
    });
  }, [
    trackEvent,
    createEventBuilder,
    linkType,
    pageTitle,
    LINK_TYPE_MAP,
    params,
    navigation,
  ]);

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

  return (
    <BottomSheet
      isFullscreen
      style={styles.screen}
      ref={bottomSheetRef}
      isInteractable={false}
    >
      <Box style={styles.box}>
        <ButtonIcon
          onPress={onDimiss}
          iconName={IconName.Close}
          iconColor={IconColor.Default}
          testID="deep-link-modal-close-button"
        />
      </Box>
      <ScrollView contentContainerStyle={styles.content}>
        <ModalImage linkType={linkType} styles={styles} />
        <Text variant={TextVariant.HeadingLG} style={styles.title}>
          {LINK_TYPE_MAP[linkType].title}
        </Text>
        <ModalDescription
          linkType={linkType}
          description={LINK_TYPE_MAP[linkType].description}
          onOpenMetaMaskStore={openMetaMaskStore}
          styles={styles}
        />
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
        label={
          LINK_TYPE_MAP[linkType].buttonLabel ||
          strings('deep_link_modal.continue_button')
        }
        onPress={onPrimaryButtonPressed}
        style={styles.actionButtonMargin}
      />
    </BottomSheet>
  );
};

export default React.memo(DeepLinkModal);
