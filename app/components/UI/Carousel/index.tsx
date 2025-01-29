import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CarouselProps } from './carousel.types';
import { Theme } from '../../../util/theme/models';
import BannerImage0 from '../../../images/banners/banner_image_0.svg';
import BannerImage1 from '../../../images/banners/banner_image_1.svg';
import BannerImage2 from '../../../images/banners/banner_image_2.svg';
import BannerImage3 from '../../../images/banners/banner_image_3.svg';
import { strings } from '../../../../locales/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { dismissBanner } from '../../../actions/banners/index';
import { RootState } from '../../../reducers';
import { useMetrics } from '../../../components/hooks/useMetrics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const CAROUSEL_HEIGHT = 59;
const DOTS_HEIGHT = 18;
const IMAGE_WIDTH = 60;
const IMAGE_HEIGHT = 59;
const PEEK_WIDTH = 5;

const PREDEFINED_SLIDES = [
  {
    id: 'bridge',
    title: strings('banner.bridge.title'),
    description: strings('banner.bridge.subtitle'),
    undismissable: false,
    href: undefined,
  },
  {
    id: 'card',
    title: strings('banner.card.title'),
    description: strings('banner.card.subtitle'),
    undismissable: false,
    href: undefined,
  },
  {
    id: 'fund',
    title: strings('banner.fund.title'),
    description: strings('banner.fund.subtitle'),
    undismissable: false,
    href: undefined,
  },
  {
    id: 'cashout',
    title: strings('banner.cashout.title'),
    description: strings('banner.cashout.subtitle'),
    undismissable: false,
    href: undefined,
  },
];

const BannerImages = [BannerImage0, BannerImage1, BannerImage2, BannerImage3];

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      width: BANNER_WIDTH + PEEK_WIDTH * 2,
      alignSelf: 'center',
      height: CAROUSEL_HEIGHT + DOTS_HEIGHT,
      overflow: 'visible',
    },
    bannerContainer: {
      height: CAROUSEL_HEIGHT,
      overflow: 'visible',
    },
    containerSingleSlide: {
      height: CAROUSEL_HEIGHT,
    },
    slideContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      height: CAROUSEL_HEIGHT,
      borderWidth: 1,
      borderColor: colors.border.muted,
      width: BANNER_WIDTH,
      marginHorizontal: PEEK_WIDTH,
      position: 'relative',
    },
    slideContainerPressed: {
      backgroundColor: colors.background.alternativePressed,
    },
    slideContent: {
      width: '100%',
      height: '100%',
      flexDirection: 'row',
      alignItems: 'center',
    },
    imageContainer: {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    textWrapper: {
      width: BANNER_WIDTH - IMAGE_WIDTH,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    },
    title: {
      color: colors.text.default,
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 14,
    },
    description: {
      color: colors.text.default,
      fontSize: 10.4,
      marginLeft: 14,
      marginTop: -4,
    },
    closeButton: {
      position: 'absolute',
      top: 4,
      right: 6,
      width: 26,
      height: 26,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-end',
      height: DOTS_HEIGHT,
      gap: 8,
    },
    progressDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.icon.muted,
      margin: 0,
    },
    progressDotActive: {
      backgroundColor: colors.icon.default,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
    },
  });

export const Carousel: React.FC<CarouselProps> = ({ onClick, style }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pressedSlideId, setPressedSlideId] = useState<string | null>(null);
  const [hasRendered, setHasRendered] = useState(false);
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const dismissedBanners = useSelector(
    (state: RootState) => state.banners.dismissedBanners,
  );

  const visibleSlides = PREDEFINED_SLIDES.filter(
    (slide) => !dismissedBanners.includes(slide.id),
  );
  const isSingleSlide = visibleSlides.length === 1;

  const handleRenderSlides = useCallback(
    (renderedSlides: typeof PREDEFINED_SLIDES) => {
      if (!hasRendered) {
        renderedSlides.forEach((slide) => {
          trackEvent(
            createEventBuilder({
              category: 'Banner Display',
              properties: {
                name: slide.id,
              },
            }).build(),
          );
        });
        setHasRendered(true);
      }
    },
    [hasRendered, trackEvent, createEventBuilder],
  );

  React.useEffect(() => {
    if (visibleSlides.length > 0) {
      handleRenderSlides(visibleSlides);
    }
  }, [visibleSlides, handleRenderSlides]);

  if (visibleSlides.length === 0) {
    return null;
  }

  const handleClose = (slideId: string) => {
    dispatch(dismissBanner(slideId));
  };

  const handleSlideClick = (slideId: string, href?: string) => {
    trackEvent(
      createEventBuilder({
        category: 'Banner Select',
        properties: {
          name: slideId,
        },
      }).build(),
    );

    if (href) {
      // @ts-expect-error global.platform is injected by the app
      global.platform.openTab({ url: href });
    }
    if (onClick) {
      onClick(slideId);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.bannerContainer}>
        <ScrollableTabView
          renderTabBar={() => <View />}
          onChangeTab={({ i }) => setSelectedIndex(i)}
          locked={isSingleSlide}
          initialPage={0}
          contentProps={{
            style: {
              overflow: 'visible',
            },
          }}
        >
          {visibleSlides.map((slide, index) => (
            <Pressable
              key={slide.id}
              style={[
                styles.slideContainer,
                pressedSlideId === slide.id && styles.slideContainerPressed,
              ]}
              onPress={() => handleSlideClick(slide.id, slide.href)}
              onPressIn={() => setPressedSlideId(slide.id)}
              onPressOut={() => setPressedSlideId(null)}
            >
              <View style={styles.slideContent}>
                {React.createElement(BannerImages[index % 4], {
                  name: `banner_image_${index % 4}`,
                  width: IMAGE_WIDTH,
                  height: IMAGE_HEIGHT,
                })}
                <View style={styles.textContainer}>
                  <View style={styles.textWrapper}>
                    <Text variant={TextVariant.BodyMD} style={styles.title}>
                      {slide.title}
                    </Text>
                    <Text
                      variant={TextVariant.BodySM}
                      style={styles.description}
                    >
                      {slide.description}
                    </Text>
                  </View>
                </View>
                {!slide.undismissable && (
                  <TouchableOpacity
                    testID="close-button"
                    style={styles.closeButton}
                    onPress={() => handleClose(slide.id)}
                  >
                    <Icon name="close" size={18} color={colors.icon.default} />
                  </TouchableOpacity>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollableTabView>
      </View>
      {!isSingleSlide && (
        <View testID="progress-dots" style={styles.progressContainer}>
          {visibleSlides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                selectedIndex === index && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default Carousel;
