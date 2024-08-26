import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  TouchableWithoutFeedback,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import StorageWrapper from '../../../store/storage-wrapper';
import {
  CURRENT_APP_VERSION,
  WHATS_NEW_APP_VERSION_SEEN,
} from '../../../constants/storage';
import StyledButton from '../StyledButton';
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
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import { whatsNewList } from './';
import { Colors } from '../../../util/theme/models';
import { WhatsNewModalSelectorsIDs } from '../../../../e2e/selectors/Modals/WhatsNewModal.selectors';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';

// NOTE: This modal is currently disabled.
// Reasons for disabling:
// 1. It was found to be disruptive to user experience.
// 2. It became repetitive for frequent users.
// 3. Its functionality now overlaps with:
//    - New notification system for product announcements
//    - Opt-in prompts for new features
// See issue: https://github.com/MetaMask/MetaMask-planning/issues/2614
// TODO: Consider removing or refactoring this component if it remains unused.

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

const WhatsNewModal = () => {
  const modalRef = useRef<ReusableModalRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const recordSeenModal = async () => {
    const version = await StorageWrapper.getItem(CURRENT_APP_VERSION);
    await StorageWrapper.setItem(WHATS_NEW_APP_VERSION_SEEN, version as string);
  };

  const dismissModal = (callback?: () => void) =>
    modalRef.current?.dismissModal(callback);

  const navigation = useNavigation();
  const callButton = useCallback(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (onPress: any) => {
      dismissModal(() => onPress({ navigation }));
    },
    [navigation],
  );

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderSlideElement = (elementInfo: any) => {
    switch (elementInfo.type) {
      case 'title':
        return (
          <Text
            color={TextColor.Default}
            variant={TextVariant.BodyLGMedium}
            style={styles.slideTitle}
          >
            {elementInfo.title}
          </Text>
        );
      case 'description':
        return (
          <Text
            color={TextColor.Default}
            variant={TextVariant.HeadingSMRegular}
            style={styles.slideDescription}
          >
            {elementInfo.description}
          </Text>
        );
      case 'image':
        return (
          <View style={styles.slideImageContainer}>
            <Image
              source={elementInfo.image}
              style={styles.slideImage}
              resizeMode={'stretch'}
            />
          </View>
        );
      case 'button':
        return (
          <View style={styles.button}>
            <StyledButton
              type={elementInfo.buttonType}
              onPress={() => callButton(elementInfo.onPress)}
            >
              {elementInfo.buttonText}
            </StyledButton>
          </View>
        );
    }
    return null;
  };

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderSlide = (slideInfo: any, index: number) => {
    const key = `slide-info-${index}`;
    return (
      <ScrollView key={key} style={styles.slideItemContainer}>
        <TouchableWithoutFeedback>
          <View>
            {
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              slideInfo.map((elementInfo: any, elIndex: number) => {
                const elKey = `${key}-${elIndex}`;
                return (
                  <View key={elKey}>{renderSlideElement(elementInfo)}</View>
                );
              })
            }
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    );
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const xOffset = e.nativeEvent.contentOffset.x;
    const slideIndex = Math.ceil(xOffset / screenWidth);
    if (currentSlide === slideIndex) {
      return;
    }
    setCurrentSlide(slideIndex);
  };

  const renderHeader = () => (
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
  );

  const renderProgressIndicators = () => (
    <View style={styles.progessContainer}>
      {whatsNewList.slides.map((_, index) => (
        <TouchableWithoutFeedback
          key={index}
          onPress={() => {
            scrollViewRef?.current?.scrollTo({
              y: 0,
              x: index * slideItemWidth,
            });
            setCurrentSlide(index);
          }}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
        >
          <View
            style={[
              styles.slideCircle,
              currentSlide === index ? styles.slideSolidCircle : {},
            ]}
          />
        </TouchableWithoutFeedback>
      ))}
    </View>
  );

  return (
    <ReusableModal
      ref={modalRef}
      style={styles.screen}
      onDismiss={recordSeenModal}
    >
      <View style={styles.modal} testID={WhatsNewModalSelectorsIDs.CONTAINER}>
        <View style={styles.bodyContainer}>
          {renderHeader()}
          <View style={styles.slideContent}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.horizontalScrollView}
              onScrollEndDrag={onScrollEnd}
              onMomentumScrollEnd={onScrollEnd}
              showsHorizontalScrollIndicator={false}
              horizontal
              pagingEnabled
              scrollEnabled={whatsNewList.slides.length > 1}
            >
              {whatsNewList.slides.map(renderSlide)}
            </ScrollView>
            {whatsNewList.slides.length > 1 ? renderProgressIndicators() : null}
          </View>
        </View>
      </View>
    </ReusableModal>
  );
};

export default WhatsNewModal;
