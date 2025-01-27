import React, { useState } from 'react';
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const CAROUSEL_HEIGHT = 59;
const DOTS_HEIGHT = 28;
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
      padding: 16,
    },
    imageContainer: {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      marginRight: 16,
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
      width: BANNER_WIDTH - (IMAGE_WIDTH + 16 + 32), // image width + margin + container padding
    },
    title: {
      color: colors.text.default,
      marginBottom: 4,
    },
    description: {
      color: colors.text.alternative,
    },
    closeButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      height: DOTS_HEIGHT,
      gap: 8,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
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

export const Carousel: React.FC<CarouselProps> = ({
  isLoading = false,
  onClose,
  onClick,
  style,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pressedSlideId, setPressedSlideId] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const visibleSlides = PREDEFINED_SLIDES;
  const isSingleSlide = false;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        {/* Add your loading component here */}
      </View>
    );
  }

  if (visibleSlides.length === 0) {
    return null;
  }

  const handleClose = (slideId: string) => {
    if (onClose) {
      onClose(slideId);
    }
  };

  const handleSlideClick = (slideId: string, href?: string) => {
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
                  preserveAspectRatio: 'xMidYMid meet',
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
                {!slide.undismissable && onClose && (
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => handleClose(slide.id)}
                  >
                    <Icon name="close" size={16} color={colors.icon.default} />
                  </TouchableOpacity>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollableTabView>
      </View>
      {!isSingleSlide && (
        <View style={styles.progressContainer}>
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
