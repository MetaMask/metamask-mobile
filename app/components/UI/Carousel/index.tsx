import React, { useState, useCallback, FC, useMemo, useEffect } from 'react';
import { View, Pressable, Linking, Image, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { styleSheet } from './styles';
import { CarouselProps, CarouselSlide, NavigationAction } from './types';
import { dismissBanner } from '../../../reducers/banners';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { PREDEFINED_SLIDES, BANNER_IMAGES } from './constants';
import { useStyles } from '../../../component-library/hooks';
import { selectDismissedBanners } from '../../../selectors/banner';
///: BEGIN:ONLY_INCLUDE_IF(solana)
import {
  selectSelectedInternalAccount,
  selectLastSelectedSolanaAccount,
} from '../../../selectors/accountsController';
import { isEvmAccountType, SolAccountType } from '@metamask/keyring-api';
import Engine from '../../../core/Engine';
///: END:ONLY_INCLUDE_IF
import { selectAddressHasTokenBalances } from '../../../selectors/tokenBalancesController';
import {
  fetchCarouselSlidesFromContentful,
  isActive,
} from './fetchCarouselSlidesFromContentful';
import { selectContentfulCarouselEnabledFlag } from './selectors/featureFlags';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon/';
import { IconName } from '../../../component-library/components/Icons/Icon';

const MAX_CAROUSEL_SLIDES = 15;

const CarouselComponent: FC<CarouselProps> = ({ style }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pressedSlideId, setPressedSlideId] = useState<string | null>(null);
  const [priorityContentfulSlides, setPriorityContentfulSlides] = useState<
    CarouselSlide[]
  >([]);
  const [regularContentfulSlides, setRegularContentfulSlides] = useState<
    CarouselSlide[]
  >([]);
  const isContentfulCarouselEnabled = useSelector(
    selectContentfulCarouselEnabledFlag,
  );
  const { trackEvent, createEventBuilder } = useMetrics();
  const hasBalance = useSelector(selectAddressHasTokenBalances);
  const dispatch = useDispatch();
  const { navigate } = useNavigation();
  const { styles } = useStyles(styleSheet, { style });
  const dismissedBanners = useSelector(selectDismissedBanners);
  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const lastSelectedSolanaAccount = useSelector(
    selectLastSelectedSolanaAccount,
  );
  ///: END:ONLY_INCLUDE_IF

  const isZeroBalance = !hasBalance;

  // Fetch slides from Contentful
  useEffect(() => {
    const loadContentfulSlides = async () => {
      if (!isContentfulCarouselEnabled) return;
      try {
        const { prioritySlides, regularSlides } =
          await fetchCarouselSlidesFromContentful();
        setPriorityContentfulSlides(
          prioritySlides.filter((slides) => isActive(slides)),
        );
        setRegularContentfulSlides(
          regularSlides.filter((slides) => isActive(slides)),
        );
      } catch (err) {
        console.warn('Failed to fetch Contentful slides:', err);
      }
    };
    loadContentfulSlides();
  }, [isContentfulCarouselEnabled]);

  // Merge all slides (predefined + contentful),
  const slidesConfig = useMemo(() => {
    const baseSlides = [
      ...priorityContentfulSlides,
      ...PREDEFINED_SLIDES,
      ...regularContentfulSlides,
    ];
    return baseSlides.map((slide) => {
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
    });
  }, [isZeroBalance, priorityContentfulSlides, regularContentfulSlides]);

  const visibleSlides = useMemo(() => {
    const filtered = slidesConfig.filter((slide: CarouselSlide) => {
      const isCurrentlyActive = isActive(slide);

      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      if (
        slide.id === 'solana' &&
        selectedAccount?.type === SolAccountType.DataAccount
      ) {
        return false;
      }
      if (
        slide.id === 'smartAccount' &&
        selectedAccount?.type &&
        !isEvmAccountType(selectedAccount.type)
      ) {
        return false;
      }
      ///: END:ONLY_INCLUDE_IF

      if (slide.id === 'fund' && isZeroBalance) {
        return true;
      }

      return isCurrentlyActive && !dismissedBanners.includes(slide.id);
    });
    return filtered.slice(0, MAX_CAROUSEL_SLIDES);
  }, [
    slidesConfig,
    isZeroBalance,
    dismissedBanners,
    ///: BEGIN:ONLY_INCLUDE_IF(solana)
    selectedAccount,
    ///: END:ONLY_INCLUDE_IF
  ]);

  const isSingleSlide = visibleSlides.length === 1;

  const openUrl =
    (href: string): (() => Promise<void>) =>
    () =>
      Linking.openURL(href).catch((error) => {
        console.error('Failed to open URL:', error);
      });

  const handleSlideClick = useCallback(
    (slideId: string, navigation: NavigationAction) => {
      const extraProperties: Record<string, string> = {};

      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      const isSolanaBanner = slideId === 'solana';
      if (isSolanaBanner && lastSelectedSolanaAccount) {
        extraProperties.action = 'redirect-solana-account';
      } else if (isSolanaBanner && !lastSelectedSolanaAccount) {
        extraProperties.action = 'create-solana-account';
      }
      ///: END:ONLY_INCLUDE_IF

      trackEvent(
        createEventBuilder({
          category: 'Banner Select',
          properties: {
            name: slideId,
            ...extraProperties,
          },
        }).build(),
      );

      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      if (isSolanaBanner && lastSelectedSolanaAccount) {
        return Engine.setSelectedAddress(lastSelectedSolanaAccount.address);
      }
      ///: END:ONLY_INCLUDE_IF

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
    [
      trackEvent,
      createEventBuilder,
      navigate,
      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      lastSelectedSolanaAccount,
      ///: END:ONLY_INCLUDE_IF
    ],
  );

  const handleClose = useCallback(
    (slideId: string) => {
      dispatch(dismissBanner(slideId));
    },
    [dispatch],
  );

  const renderBannerSlides = useCallback(
    ({ item: slide }: { item: CarouselSlide }) => (
      <Pressable
        key={slide.id}
        testID={`carousel-slide-${slide.id}`}
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
              source={
                slide.id.startsWith('contentful-')
                  ? { uri: slide.image }
                  : BANNER_IMAGES[slide.id]
              }
              style={styles.bannerImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.textWrapper}>
              <Text
                variant={TextVariant.BodyMD}
                style={styles.title}
                testID={`carousel-slide-${slide.id}-title`}
              >
                {slide.title}
              </Text>
              <Text variant={TextVariant.BodySM} style={styles.description}>
                {slide.description}
              </Text>
            </View>
          </View>
          {!slide.undismissable && (
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSizes.Md}
              onPress={() => handleClose(slide.id)}
              testID={`carousel-slide-${slide.id}-close-button`}
              style={styles.closeButton}
            />
          )}
        </View>
      </Pressable>
    ),
    [styles, handleSlideClick, handleClose, pressedSlideId],
  );

  // Track banner display events when visible slides change
  useEffect(() => {
    visibleSlides.forEach((slide: CarouselSlide) => {
      trackEvent(
        createEventBuilder({
          category: 'Banner Display',
          properties: {
            name: slide.id,
          },
        }).build(),
      );
    });
  }, [visibleSlides, trackEvent, createEventBuilder]);

  const renderProgressDots = useMemo(
    () => (
      <View
        testID={WalletViewSelectorsIDs.CAROUSEL_PROGRESS_DOTS}
        style={styles.progressContainer}
      >
        {visibleSlides.map((slide: CarouselSlide, index: number) => (
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
    <View style={styles.base}>
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
          testID={WalletViewSelectorsIDs.CAROUSEL_CONTAINER}
        />
      </View>
      {!isSingleSlide && renderProgressDots}
    </View>
  );
};

// Split memo component so we still see a Component name when profiling
export const Carousel = React.memo(CarouselComponent);
export default Carousel;
