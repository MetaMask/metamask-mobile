import React, { useRef } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
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
import { WhatsNewModalSelectorsIDs } from '../../../../e2e/selectors/Modals/WhatsNewModal.selectors';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { shouldShowWhatsNewModal } from '../../../util/onboarding';
import Routes from '../../../constants/navigation/Routes';

const modalMargin = 24;
const modalPadding = 24;
const screenWidth = Device.getDeviceWidth();
const screenHeight = Device.getDeviceHeight();
const slideItemWidth = screenWidth - modalMargin * 2;
const maxSlideItemHeight = screenHeight - 200;
const slideImageWidth = slideItemWidth - modalPadding * 2;
const imageAspectRatio = 128 / 264;
const slideImageHeight = slideImageWidth * imageAspectRatio;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    slideContent: {
      maxHeight: maxSlideItemHeight,
    },
    slideItemContainer: {
      flex: 1,
      width: slideItemWidth,
      paddingHorizontal: modalPadding,
      paddingBottom: 16,
    },
    progessContainer: {
      flexDirection: 'row',
      alignSelf: 'center',
      marginTop: 16,
      marginBottom: 8,
    },
    slideCircle: {
      width: 8,
      height: 8,
      borderRadius: 8 / 2,
      backgroundColor: colors.icon.default,
      opacity: 0.4,
      marginHorizontal: 8,
    },
    slideSolidCircle: {
      opacity: 1,
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
    slideImageContainer: {
      flexDirection: 'row',
      borderRadius: 10,
      marginBottom: 24,
    },
    slideImage: {
      flex: 1,
      borderRadius: 10,
      width: slideImageWidth,
      height: slideImageHeight,
    },
    slideTitle: {
      marginBottom: 12,
    },
    slideDescription: {
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
      paddingVertical: 32,
    },
    horizontalScrollView: { flexGrow: 0 },
  });

const SmartTransactionsOptInModal = () => {
  const navigation = useNavigation();
  const modalRef = useRef<ReusableModalRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const onDismiss = async () => {
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

  const dismissModal = async () => {
    modalRef.current?.dismissModal();
  };

  return (
    <ReusableModal ref={modalRef} style={styles.screen} onDismiss={onDismiss}>
      <View style={styles.modal} testID={WhatsNewModalSelectorsIDs.CONTAINER}>
        <View style={styles.bodyContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text color={TextColor.Default} variant={TextVariant.HeadingMD}>
              {strings('whats_new.title')}
            </Text>
            <View style={styles.headerClose}>
              <TouchableOpacity
                onPress={() => dismissModal()}
                hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
                testID={WhatsNewModalSelectorsIDs.CLOSE_BUTTON}
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
          <View style={styles.slideContent}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.horizontalScrollView}
              showsHorizontalScrollIndicator={false}
              horizontal
              pagingEnabled
              scrollEnabled
            >
              <Text>HELLO this is STX opt in modal</Text>
            </ScrollView>
          </View>
        </View>
      </View>
    </ReusableModal>
  );
};

export default SmartTransactionsOptInModal;
