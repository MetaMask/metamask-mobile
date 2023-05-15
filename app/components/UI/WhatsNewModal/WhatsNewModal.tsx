import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  TouchableWithoutFeedback,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { fontStyles } from '../../../styles/common';
import Icon from 'react-native-vector-icons/FontAwesome';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CURRENT_APP_VERSION,
  WHATS_NEW_APP_VERSION_SEEN,
} from '../../../constants/storage';
import StyledButton from '../StyledButton';
import { useTheme } from '../../../util/theme';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import { whatsNewList } from './';
import { Colors } from '../../../util/theme/models';
import {
  WHATS_NEW_MODAL_CONTAINER_ID,
  WHATS_NEW_MODAL_CLOSE_BUTTON_ID,
} from '../../../constants/test-ids';
import { ScrollView } from 'react-native-gesture-handler';
import generateTestId from '../../../../wdio/utils/generateTestId';

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
    headerCenterAux: {
      flex: 1,
    },
    headerClose: {
      flex: 1,
      alignItems: 'flex-end',
    },
    headerText: {
      ...fontStyles.bold,
      fontSize: 18,
      color: colors.text.default,
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
      ...fontStyles.bold,
      fontSize: 16,
      marginBottom: 12,
      color: colors.text.default,
    },
    slideDescription: {
      ...fontStyles.normal,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text.default,
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

interface WhatsNewModalProps {
  navigation: any;
}

const WhatsNewModal = (props: WhatsNewModalProps) => {
  const modalRef = useRef<ReusableModalRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const recordSeenModal = async () => {
    const version = await AsyncStorage.getItem(CURRENT_APP_VERSION);
    await AsyncStorage.setItem(WHATS_NEW_APP_VERSION_SEEN, version as string);
  };

  const dismissModal = (callback?: () => void) =>
    modalRef.current?.dismissModal(callback);

  const callButton = (onPress: any) => {
    dismissModal(() => onPress(props));
  };

  const renderSlideElement = (elementInfo: any) => {
    switch (elementInfo.type) {
      case 'title':
        return <Text style={styles.slideTitle}>{elementInfo.title}</Text>;
      case 'description':
        return (
          <Text style={styles.slideDescription}>{elementInfo.description}</Text>
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

  const renderSlide = (slideInfo: any, index: number) => {
    const key = `slide-info-${index}`;
    return (
      <ScrollView key={key} style={styles.slideItemContainer}>
        <TouchableWithoutFeedback>
          <View>
            {slideInfo.map((elementInfo: any, elIndex: number) => {
              const elKey = `${key}-${elIndex}`;
              return <View key={elKey}>{renderSlideElement(elementInfo)}</View>;
            })}
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
      <View style={styles.headerCenterAux} />
      <Text style={styles.headerText}>{strings('whats_new.title')}</Text>
      <View style={styles.headerClose}>
        <TouchableOpacity
          onPress={() => dismissModal()}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          {...generateTestId(Platform, WHATS_NEW_MODAL_CLOSE_BUTTON_ID)}
        >
          <Icon name="times" size={16} color={colors.icon.default} />
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
      <View
        style={styles.modal}
        {...generateTestId(Platform, WHATS_NEW_MODAL_CONTAINER_ID)}
      >
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
