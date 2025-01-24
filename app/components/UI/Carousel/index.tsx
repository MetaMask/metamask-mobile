import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ImageStyle,
  Pressable,
} from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CarouselProps } from './carousel.types';
import { Theme } from '../../../util/theme/models';

const CAROUSEL_HEIGHT = 100;
const CAROUSEL_HEIGHT_SINGLE = 70;
const ACCESSORY_WIDTH = 60;

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      height: CAROUSEL_HEIGHT,
    },
    containerSingleSlide: {
      height: CAROUSEL_HEIGHT_SINGLE,
    },
    slideContainer: {
      position: 'relative',
      backgroundColor: colors.background.alternative,
    },
    slideContainerPressed: {
      backgroundColor: colors.background.alternativePressed,
    },
    slideContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 0,
    },
    imageContainer: {
      width: ACCESSORY_WIDTH,
      height: '100%',
    },
    image: {
      width: ACCESSORY_WIDTH,
      height: '100%',
      resizeMode: 'cover',
    } as ImageStyle,
    textContainer: {
      flex: 1,
      marginLeft: 16,
      marginRight: 40,
    },
    title: {
      marginBottom: 4,
    },
    description: {
      marginBottom: 4,
    },
    closeButton: {
      position: 'absolute',
      top: 8,
      right: 6,
      padding: 8,
      zIndex: 1,
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      height: 40,
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
  slides = [],
  isLoading = false,
  onClose,
  onClick,
  style,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pressedSlideId, setPressedSlideId] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const visibleSlides = slides
    .filter((slide) => !slide.dismissed || slide.undismissable)
    .sort((a, b) => {
      if (a.undismissable && !b.undismissable) return -1;
      if (!a.undismissable && b.undismissable) return 1;
      return 0;
    });

  const isSingleSlide = visibleSlides.length === 1;

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

  const renderTabBar = () => {
    if (isSingleSlide) return <View />;
    return (
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
    );
  };

  return (
    <View
      style={[
        styles.container,
        isSingleSlide && styles.containerSingleSlide,
        style,
      ]}
    >
      <ScrollableTabView
        renderTabBar={renderTabBar}
        onChangeTab={({ i }) => setSelectedIndex(i)}
        locked={isSingleSlide}
      >
        {visibleSlides.map((slide) => (
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
              {slide.image && (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: slide.image }} style={styles.image} />
                </View>
              )}
              <View style={styles.textContainer}>
                <Text variant={TextVariant.BodyMD} style={styles.title}>
                  {slide.title}
                </Text>
                <Text variant={TextVariant.BodySM} style={styles.description}>
                  {slide.description}
                </Text>
              </View>
            </View>
            {!slide.undismissable && onClose && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => handleClose(slide.id)}
              >
                <Icon name="close" size={24} color={colors.icon.default} />
              </TouchableOpacity>
            )}
          </Pressable>
        ))}
      </ScrollableTabView>
    </View>
  );
};
