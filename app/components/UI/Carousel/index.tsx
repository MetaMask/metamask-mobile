import React, { useState, useCallback, FC, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Pressable,
  Linking,
  Image,
  FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styleSheet } from './styles';
import { CarouselProps, CarouselSlide, NavigationAction } from './types';
import { dismissBanner } from '../../../reducers/banners';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useMultichainBalances } from '../../hooks/useMultichainBalances';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { useTheme } from '../../../util/theme';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { PREDEFINED_SLIDES, BANNER_IMAGES } from './constants';
import { useStyles } from '../../../component-library/hooks';
import { selectDismissedBanners } from '../../../selectors/banner';

export const Carousel: FC<CarouselProps> = ({ style }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pressedSlideId, setPressedSlideId] = useState<string | null>(null);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { multichainBalances } = useMultichainBalances();
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { navigate } = useNavigation();
  const { styles } = useStyles(styleSheet, { style });
  const dismissedBanners = useSelector(selectDismissedBanners);
  const isZeroBalance = multichainBalances.totalFiatBalance === 0;

  const slidesConfig = useMemo(
    () =>
      PREDEFINED_SLIDES.map((slide) => {
        if (slide.id === 'fund' && isZeroBalance) {
          return {
            ...slide,
            undismissable: true,
          };
        }
        return {
          ...slide,
          undismissable: false,
        };
      }),
    [isZeroBalance],
  );

  const visibleSlides = useMemo(
    () =>
      slidesConfig.filter((slide) => {
        if (slide.id === 'fund' && isZeroBalance) {
          return true;
        }
        return !dismissedBanners.includes(slide.id);
      }),
    [slidesConfig, isZeroBalance, dismissedBanners],
  );

  const isSingleSlide = visibleSlides.length === 1;

  const openUrl =
    (href: string): (() => Promise<void>) =>
    () =>
      Linking.openURL(href).catch((error) => {
        console.error('Failed to open URL:', error);
      });

  const handleSlideClick = useCallback(
    (slideId: string, navigation: NavigationAction) => {
      trackEvent(
        createEventBuilder({
          category: 'Banner Select',
          properties: {
            name: slideId,
          },
        }).build(),
      );

      if (navigation.type === 'url') {
        return openUrl(navigation.href)();
      }

      if (navigation.type === 'function') {
        return navigate(...navigation.navigate());
      }

      if (navigation.type === 'route') {
        return navigate(navigation.route);
      }
    },
    [navigate, trackEvent, createEventBuilder],
  );

  const handleClose = useCallback(
    (slideId: string) => {
      dispatch(dismissBanner(slideId));
    },
    [dispatch],
  );

  const renderBannerSlides = useCallback(
    ({ item: slide }: { item: CarouselSlide }) => {
      trackEvent(
        createEventBuilder({
          category: 'Banner Display',
          properties: {
            name: slide.id,
          },
        }).build(),
      );

      return (
        <Pressable
          key={slide.id}
          testID={slide.testID}
          style={[
            styles.slideContainer,
            pressedSlideId === slide.id && styles.slideContainerPressed,
          ]}
          onPress={() => handleSlideClick(slide.id, slide.navigation)}
          onPressIn={() => setPressedSlideId(slide.id)}
          onPressOut={() => setPressedSlideId(null)}
        >
          <View style={styles.slideContent}>
            <View style={styles.imageContainer}>
              <Image
                source={BANNER_IMAGES[slide.id]}
                style={styles.bannerImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.textWrapper}>
                <Text
                  variant={TextVariant.BodyMD}
                  style={styles.title}
                  testID={slide.testIDTitle}
                >
                  {slide.title}
                </Text>
                <Text variant={TextVariant.BodySM} style={styles.description}>
                  {slide.description}
                </Text>
              </View>
            </View>
            {!slide.undismissable && (
              <TouchableOpacity
                testID={slide.testIDCloseButton}
                style={styles.closeButton}
                onPress={() => handleClose(slide.id)}
              >
                <Icon name="close" size={18} color={colors.icon.default} />
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      );
    },
    [
      styles,
      handleSlideClick,
      handleClose,
      colors.icon.default,
      pressedSlideId,
      trackEvent,
      createEventBuilder,
    ],
  );

  const renderProgressDots = useMemo(
    () => (
      <View
        testID={WalletViewSelectorsIDs.CAROUSEL_PROGRESS_DOTS}
        style={styles.progressContainer}
      >
        {visibleSlides.map((slide, index) => (
          <View
            key={slide.id}
            style={[
              styles.progressDot,
              selectedIndex === index && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
    ),
    [
      visibleSlides,
      selectedIndex,
      styles.progressContainer,
      styles.progressDot,
      styles.progressDotActive,
    ],
  );

  if (visibleSlides.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.base}
      testID={WalletViewSelectorsIDs.CAROUSEL_CONTAINER}
    >
      <View style={styles.bannerContainer}>
        <FlatList
          data={visibleSlides}
          renderItem={renderBannerSlides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(
              event.nativeEvent.contentOffset.x /
                event.nativeEvent.layoutMeasurement.width,
            );
            setSelectedIndex(newIndex);
          }}
        />
      </View>
      {!isSingleSlide && renderProgressDots}
    </View>
  );
};

export default Carousel;
