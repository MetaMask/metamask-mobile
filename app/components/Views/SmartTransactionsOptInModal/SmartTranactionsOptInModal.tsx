import React, { useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import AsyncStorage from '../../../store/async-storage-wrapper';
import {
  CURRENT_APP_VERSION,
  SMART_TRANSACTIONS_OPT_IN_MODAL_APP_VERSION_SEEN,
} from '../../../constants/storage';
import { useTheme } from '../../../util/theme';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import { Colors } from '../../../util/theme/models';
import { SmartTransactionsOptInModalSelectorsIDs } from '../../../../e2e/selectors/Modals/SmartTransactionsOptInModal.selectors';
import { useNavigation } from '@react-navigation/native';
import { shouldShowWhatsNewModal } from '../../../util/onboarding';
import Routes from '../../../constants/navigation/Routes';
import img from '../../../images/metamask-smart-transactions.png';
import StyledButton from '../../UI/StyledButton';
import Engine from '../../../core/Engine';

const modalMargin = 24;
const modalPadding = 24;
const screenWidth = Device.getDeviceWidth();
const screenHeight = Device.getDeviceHeight();
const itemWidth = screenWidth - modalMargin * 2;
const maxItemHeight = screenHeight - 200;
const imageWidth = itemWidth - modalPadding * 2;
const imageAspectRatio = 128 / 264;
const imageHeight = imageWidth * imageAspectRatio;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    content: {
      maxHeight: maxItemHeight,
    },
    button: {
      marginTop: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      paddingHorizontal: modalPadding,
    },
    headerClose: {
      flex: 1,
      alignItems: 'flex-end',
    },
    imageContainer: {
      flexDirection: 'row',
      borderRadius: 10,
      marginBottom: 24,
    },
    image: {
      flex: 1,
      borderRadius: 10,
      width: imageWidth,
      height: imageHeight,
    },
    title: {
      marginBottom: 12,
    },
    description: {
      lineHeight: 20,
      marginBottom: 24,
    },
    screen: { justifyContent: 'center', alignItems: 'center' },
    modal: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      marginHorizontal: modalMargin,
    },
    bodyContainer: {
      width: itemWidth,
      paddingHorizontal: modalPadding,
      paddingVertical: 32,
      paddingBottom: 16,
    },
  });

const SmartTransactionsOptInModal = () => {
  const navigation = useNavigation();
  const modalRef = useRef<ReusableModalRef>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const hasOptedIn = useRef<boolean | null>(null);

  const dismissModal = async () => {
    modalRef.current?.dismissModal();
  };

  const optIn = () => {
    Engine.context.PreferencesController.setSmartTransactionsOptInStatus(true);
    hasOptedIn.current = true;
    dismissModal();
  };

  const optOut = () => {
    Engine.context.PreferencesController.setSmartTransactionsOptInStatus(false);
    hasOptedIn.current = false;
    dismissModal();
  };

  const onDismiss = async () => {
    // Opt out of STX if no prior decision made
    if (hasOptedIn.current === null) {
      optOut();
    }

    // Save the current app version as the last app version seen
    const version = await AsyncStorage.getItem(CURRENT_APP_VERSION);
    await AsyncStorage.setItem(
      SMART_TRANSACTIONS_OPT_IN_MODAL_APP_VERSION_SEEN,
      version as string,
    );

    // See if we need to show What's New modal
    const shouldShowWhatsNew = await shouldShowWhatsNewModal();
    if (shouldShowWhatsNew) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.WHATS_NEW,
      });
    }
  };

  return (
    <ReusableModal ref={modalRef} style={styles.screen} onDismiss={onDismiss}>
      <View
        style={styles.modal}
        testID={SmartTransactionsOptInModalSelectorsIDs.CONTAINER}
      >
        <View style={styles.bodyContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text color={TextColor.Default} variant={TextVariant.HeadingSM}>
              {strings('whats_new.stx.header')}
            </Text>
            <View style={styles.headerClose}>
              <TouchableOpacity
                onPress={() => dismissModal()}
                hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
                testID={SmartTransactionsOptInModalSelectorsIDs.CLOSE_BUTTON}
              >
                <Icon
                  name={IconName.Close}
                  size={IconSize.Md}
                  color={IconColor.Default}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.imageContainer}>
              <Image source={img} style={styles.image} resizeMode={'contain'} />
            </View>

            <Text
              color={TextColor.Default}
              variant={TextVariant.BodyMDBold}
              style={styles.title}
            >
              {strings('whats_new.stx.title')}
            </Text>

            <Text
              color={TextColor.Default}
              variant={TextVariant.HeadingSMRegular}
              style={styles.description}
            >
              {strings('whats_new.stx.description_1')}
            </Text>
            <Text
              color={TextColor.Default}
              variant={TextVariant.HeadingSMRegular}
              style={styles.description}
            >
              {strings('whats_new.stx.description_2')}
            </Text>

            <View style={styles.button}>
              <StyledButton type={'transparent-blue'} onPress={optOut}>
                {strings('whats_new.stx.secondary_button')}
              </StyledButton>
            </View>

            <View style={styles.button}>
              <StyledButton type={'blue'} onPress={optIn}>
                {strings('whats_new.stx.primary_button')}
              </StyledButton>
            </View>
          </View>
        </View>
      </View>
    </ReusableModal>
  );
};

export default SmartTransactionsOptInModal;
