import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  Image,
  TouchableWithoutFeedback,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageSourcePropType,
  Animated,
} from 'react-native';
import { strings } from '../../../../locales/i18n';
import StorageWrapper from '../../../store/storage-wrapper';
import {
  CURRENT_APP_VERSION,
  WHATS_NEW_APP_VERSION_SEEN,
} from '../../../constants/storage';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { whatsNewList } from './';
import { WhatsNewModalSelectorsIDs } from '../../../../e2e/selectors/Onboarding/WhatsNewModal.selectors';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootParamList } from '../../../types/navigation';
import createStyles from './WhatsNewModal.styles';
import Device from '../../../util/device';
import { SlideContent, SlideContentType } from './types';

const CAROUSEL_INTERVAL_MS = 4000;
const SLIDE_PADDING = 48;

const WhatsNewModal = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const imageCarouselRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const imageCarouselIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const imageProgressAnimations = useRef<Animated.Value[]>([]).current;

  const initializeImageProgressAnimations = useCallback(
    (imageCount: number) => {
      imageProgressAnimations.length = 0;

      for (let i = 0; i < imageCount; i++) {
        imageProgressAnimations.push(new Animated.Value(i === 0 ? 1 : 0));
      }
    },
    [imageProgressAnimations],
  );

  const animateImageProgressIndicators = useCallback(
    (activeIndex: number) => {
      imageProgressAnimations.forEach((animation, index) => {
        Animated.timing(animation, {
          toValue: index === activeIndex ? 1 : 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    },
    [imageProgressAnimations],
  );

  const getCarouselImages = useCallback(() => {
    const currentSlideData = whatsNewList.slides[currentSlide];
    return currentSlideData?.find(
      (slideElement) => slideElement.type === SlideContentType.CAROUSEL_IMAGES,
    );
  }, [currentSlide]);

  const advanceToNextImage = useCallback(() => {
    const carouselImages = getCarouselImages();
    if (
      !carouselImages ||
      carouselImages.type !== SlideContentType.CAROUSEL_IMAGES
    ) {
      return;
    }

    setCurrentImageIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % carouselImages.images.length;
      const carouselImageWidth = Device.getDeviceWidth() - SLIDE_PADDING;

      imageCarouselRef.current?.scrollTo({
        x: nextIndex * carouselImageWidth,
        y: 0,
        animated: true,
      });

      animateImageProgressIndicators(nextIndex);

      return nextIndex;
    });
  }, [getCarouselImages, animateImageProgressIndicators]);

  const startAutoAdvance = useCallback(() => {
    if (imageCarouselIntervalRef.current) {
      clearInterval(imageCarouselIntervalRef.current);
    }

    imageCarouselIntervalRef.current = setInterval(
      advanceToNextImage,
      CAROUSEL_INTERVAL_MS,
    );
  }, [advanceToNextImage]);

  const clearAutoAdvance = useCallback(() => {
    if (imageCarouselIntervalRef.current) {
      clearInterval(imageCarouselIntervalRef.current);
      imageCarouselIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const carouselImages = getCarouselImages();
    if (
      !carouselImages ||
      carouselImages.type !== SlideContentType.CAROUSEL_IMAGES
    ) {
      return;
    }

    initializeImageProgressAnimations(carouselImages.images.length);
    startAutoAdvance();
    return clearAutoAdvance;
  }, [
    currentSlide,
    getCarouselImages,
    startAutoAdvance,
    clearAutoAdvance,
    initializeImageProgressAnimations,
  ]);

  const recordSeenModal = async () => {
    const version = await StorageWrapper.getItem(CURRENT_APP_VERSION);
    await StorageWrapper.setItem(WHATS_NEW_APP_VERSION_SEEN, version as string);
  };

  const dismissModal = useCallback(
    (callback?: () => void) => {
      clearAutoAdvance();
      if (sheetRef.current) {
        sheetRef.current.onCloseBottomSheet(callback);
      } else {
        navigation.goBack();
        callback?.();
      }
    },
    [navigation, clearAutoAdvance],
  );

  const callButton = useCallback(
    (
      onPress: (props: { navigation: NavigationProp<RootParamList> }) => void,
    ) => {
      dismissModal(() =>
        onPress({ navigation: navigation as NavigationProp<RootParamList> }),
      );
    },
    [navigation, dismissModal],
  );

  const onImageCarouselScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const xOffset = e.nativeEvent.contentOffset.x;
      const imageWidth = e.nativeEvent.layoutMeasurement.width;
      const imageIndex = Math.round(xOffset / imageWidth);

      if (currentImageIndex === imageIndex) {
        return;
      }

      setCurrentImageIndex(imageIndex);
      animateImageProgressIndicators(imageIndex);
      startAutoAdvance();
    },
    [currentImageIndex, startAutoAdvance, animateImageProgressIndicators],
  );

  const selectImage = useCallback(
    (index: number) => {
      const imageWidth = Device.getDeviceWidth() - SLIDE_PADDING;
      imageCarouselRef.current?.scrollTo({
        x: index * imageWidth,
        y: 0,
        animated: true,
      });
      setCurrentImageIndex(index);
      animateImageProgressIndicators(index);
      startAutoAdvance();
    },
    [startAutoAdvance, animateImageProgressIndicators],
  );

  const renderSlideElement = useCallback(
    (elementInfo: SlideContent) => {
      switch (elementInfo.type) {
        case SlideContentType.TITLE:
          return (
            <Text
              color={TextColor.Default}
              variant={TextVariant.BodyLGMedium}
              style={styles.slideTitle}
            >
              {elementInfo.title}
            </Text>
          );
        case SlideContentType.DESCRIPTION:
          return (
            <Text
              color={TextColor.Default}
              variant={TextVariant.BodyMD}
              style={styles.slideDescription}
            >
              {elementInfo.description}
            </Text>
          );
        case SlideContentType.DESCRIPTIONS:
          return (
            <View style={styles.descriptionsContainer}>
              {elementInfo.descriptions.map((descriptionKey, index) => (
                <View key={index} style={styles.descriptionItem}>
                  <Icon
                    name={IconName.Check}
                    size={IconSize.Md}
                    color={IconColor.Success}
                    style={styles.featureCheckmark}
                  />
                  <Text
                    color={TextColor.Default}
                    variant={TextVariant.BodyMD}
                    style={styles.featureText}
                  >
                    {descriptionKey}
                  </Text>
                </View>
              ))}
            </View>
          );
        case SlideContentType.IMAGE:
          return (
            <View style={styles.slideImageContainer}>
              <Image
                source={(elementInfo as { image: ImageSourcePropType }).image}
                style={styles.previewImage}
                resizeMode={'contain'}
              />
            </View>
          );
        case SlideContentType.CAROUSEL_IMAGES:
          return (
            <View
              style={[
                styles.slideImageContainer,
                elementInfo.images.length === 1 && styles.marginBottom,
              ]}
            >
              <ScrollView
                ref={imageCarouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScrollEndDrag={onImageCarouselScrollEnd}
                onMomentumScrollEnd={onImageCarouselScrollEnd}
                style={styles.imageCarousel}
              >
                {elementInfo.images.map(
                  (
                    imageInfo: { image: ImageSourcePropType; alt: string },
                    index: number,
                  ) => (
                    <View key={index} style={styles.carouselImageContainer}>
                      <Image
                        source={imageInfo.image}
                        style={styles.previewImage}
                        resizeMode={'contain'}
                      />
                    </View>
                  ),
                )}
              </ScrollView>
              {elementInfo.images.length > 1 && (
                <View style={styles.imageProgressContainer}>
                  {elementInfo.images.map(
                    (
                      _: { image: ImageSourcePropType; alt: string },
                      index: number,
                    ) => (
                      <TouchableWithoutFeedback
                        key={index}
                        onPress={() => selectImage(index)}
                        hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
                      >
                        <Animated.View
                          style={[
                            styles.imageProgressDot,
                            {
                              width:
                                imageProgressAnimations[index]?.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [8, 24],
                                }) || (currentImageIndex === index ? 24 : 8),
                              backgroundColor:
                                imageProgressAnimations[index]?.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [
                                    styles.imageProgressDot.backgroundColor,
                                    styles.imageProgressDotActive
                                      .backgroundColor,
                                  ],
                                }) ||
                                (currentImageIndex === index
                                  ? styles.imageProgressDotActive
                                      .backgroundColor
                                  : styles.imageProgressDot.backgroundColor),
                            },
                          ]}
                        />
                      </TouchableWithoutFeedback>
                    ),
                  )}
                </View>
              )}
            </View>
          );
        case SlideContentType.MORE_INFORMATION:
          return (
            <Text
              color={TextColor.Default}
              variant={TextVariant.BodyMD}
              style={styles.moreInformation}
            >
              {elementInfo.moreInformation}
            </Text>
          );
        case SlideContentType.BUTTON:
          return (
            <View style={styles.button}>
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={elementInfo.buttonText}
                onPress={() => callButton(elementInfo.onPress)}
              />
            </View>
          );
      }
    },
    [
      styles,
      selectImage,
      currentImageIndex,
      callButton,
      onImageCarouselScrollEnd,
      imageProgressAnimations,
    ],
  );

  const renderSlide = useCallback(
    (slideInfo: SlideContent[], index: number) => {
      const key = `slide-info-${index}`;
      return (
        <View key={key} style={styles.slideItemContainer}>
          <TouchableWithoutFeedback>
            <View>
              {slideInfo.map((elementInfo: SlideContent, elIndex: number) => {
                const elKey = `${key}-${elIndex}`;
                return (
                  <View key={elKey}>{renderSlideElement(elementInfo)}</View>
                );
              })}
            </View>
          </TouchableWithoutFeedback>
        </View>
      );
    },
    [styles.slideItemContainer, renderSlideElement],
  );

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const xOffset = e.nativeEvent.contentOffset.x;
      const slideItemWidth = e.nativeEvent.layoutMeasurement.width;
      const slideIndex = Math.round(xOffset / slideItemWidth);
      if (currentSlide === slideIndex) {
        return;
      }
      setCurrentSlide(slideIndex);
    },
    [currentSlide],
  );

  const renderedSlides = useMemo(
    () => whatsNewList.slides.map(renderSlide),
    [renderSlide],
  );

  return (
    <BottomSheet ref={sheetRef} onClose={recordSeenModal}>
      <View style={styles.headerContainer}>
        <Text variant={TextVariant.HeadingMD} style={styles.header}>
          {strings('whats_new.remove_gns_new_ui_update.title')}
        </Text>
      </View>
      <View testID={WhatsNewModalSelectorsIDs.CONTAINER}>
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
            {renderedSlides}
          </ScrollView>
        </View>
      </View>
    </BottomSheet>
  );
};

export default WhatsNewModal;
