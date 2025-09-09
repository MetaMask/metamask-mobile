import React, {
  useState,
  useCallback,
  FC,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import {
  Pressable,
  Linking,
  Image as RNImage,
  Dimensions,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { CarouselProps, CarouselSlide, NavigationAction } from './types';
import { dismissBanner } from '../../../reducers/banners';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { selectDismissedBanners } from '../../../selectors/banner';
///: BEGIN:ONLY_INCLUDE_IF(solana)
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import {
  selectSelectedInternalAccount,
  selectLastSelectedSolanaAccount,
} from '../../../selectors/accountsController';
import { SolAccountType, SolScope } from '@metamask/keyring-api';
import Engine from '../../../core/Engine';
///: END:ONLY_INCLUDE_IF
import { selectAddressHasTokenBalances } from '../../../selectors/tokenBalancesController';
import {
  fetchCarouselSlidesFromContentful,
  isActive,
} from './fetchCarouselSlidesFromContentful';
import { selectContentfulCarouselEnabledFlag } from './selectors/featureFlags';
import { createBuyNavigationDetails } from '../Ramp/Aggregator/routes/utils';
import Routes from '../../../constants/navigation/Routes';

const MAX_CAROUSEL_SLIDES = 8;

// Constants from original styles
const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = 100;

function orderByCardPlacement(slides: CarouselSlide[]): CarouselSlide[] {
  const placed: (CarouselSlide | undefined)[] = [];
  const unplaced: CarouselSlide[] = [];

  for (const s of slides) {
    const raw = s.cardPlacement;
    const n = typeof raw === 'string' ? Number(raw) : raw;
    if (typeof n === 'number' && Number.isFinite(n)) {
      const idx = Math.max(0, Math.floor(n) - 1); // convert 1-based to 0-based
      if (idx >= placed.length) placed.length = idx + 1;
      placed[idx] = s;
    } else {
      unplaced.push(s);
    }
  }

  let up = 0;
  for (let i = 0; i < placed.length && up < unplaced.length; i++) {
    if (!placed[i]) placed[i] = unplaced[up++];
  }
  while (up < unplaced.length) placed.push(unplaced[up++]);

  return placed.filter(Boolean) as CarouselSlide[];
}

const CarouselComponent: FC<CarouselProps> = ({ style, dummyData }) => {
  const [priorityContentfulSlides, setPriorityContentfulSlides] = useState<
    CarouselSlide[]
  >([]);
  const [regularContentfulSlides, setRegularContentfulSlides] = useState<
    CarouselSlide[]
  >([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showGrayBox, setShowGrayBox] = useState(true);
  const [isCarouselVisible, setIsCarouselVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideUpAnim = useRef(new Animated.Value(0)).current;
  const grayBoxScaleY = useRef(new Animated.Value(1)).current; // 1 = full height, 0 = collapsed
  const carouselScaleY = useRef(new Animated.Value(1)).current; // For fold-up animation
  const isAnimating = useRef(false);
  const isContentfulCarouselEnabled = useSelector(
    selectContentfulCarouselEnabledFlag,
  );
  const { trackEvent, createEventBuilder } = useMetrics();
  const hasBalance = useSelector(selectAddressHasTokenBalances);
  const dispatch = useDispatch();
  const { navigate } = useNavigation();
  const tw = useTailwind();
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

  const applyLocalNavigation = useCallback(
    (s: CarouselSlide): CarouselSlide => {
      // fund → open buy flow
      if (s.variableName === 'fund') {
        return {
          ...s,
          navigation: {
            type: 'function',
            navigate: () => createBuyNavigationDetails(),
          },
        };
      }
      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      // solana → open add-account flow (if we don't already redirect below)
      if (s.variableName === 'solana') {
        return {
          ...s,
          navigation: {
            type: 'function',
            navigate: () =>
              [
                Routes.MODAL.ROOT_MODAL_FLOW,
                {
                  screen: Routes.SHEET.ADD_ACCOUNT,
                  params: {
                    clientType: WalletClientType.Solana,
                    scope: SolScope.Mainnet,
                  },
                },
              ] as const,
          },
        };
      }
      ///: END:ONLY_INCLUDE_IF
      return s; // keep Contentful linkUrl for everything else
    },
    [],
  );

  const slidesConfig = useMemo(() => {
    // If dummy data is provided, use it instead of Contentful data
    if (dummyData && dummyData.length > 0) {
      return dummyData.map((s: CarouselSlide): CarouselSlide => {
        const withNav = applyLocalNavigation(s);
        if (withNav.variableName === 'fund' && isZeroBalance) {
          return { ...withNav, undismissable: withNav.undismissable || true };
        }
        return withNav;
      });
    }

    const patch = (s: CarouselSlide): CarouselSlide => {
      const withNav = applyLocalNavigation(s);
      if (withNav.variableName === 'fund' && isZeroBalance) {
        return { ...withNav, undismissable: withNav.undismissable || true };
      }
      return withNav;
    };

    const priority = priorityContentfulSlides.map(patch);
    const regular = orderByCardPlacement(regularContentfulSlides.map(patch));
    return [...priority, ...regular];
  }, [
    dummyData,
    applyLocalNavigation,
    isZeroBalance,
    priorityContentfulSlides,
    regularContentfulSlides,
  ]);

  const visibleSlides = useMemo(() => {
    const filtered = slidesConfig.filter((slide: CarouselSlide) => {
      const active = isActive(slide);
      if (!active) return false;

      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      if (
        slide.variableName === 'solana' &&
        selectedAccount?.type === SolAccountType.DataAccount
      ) {
        return false;
      }
      ///: END:ONLY_INCLUDE_IF

      return !dismissedBanners.includes(slide.id);
    });
    return filtered.slice(0, MAX_CAROUSEL_SLIDES);
  }, [
    slidesConfig,
    dismissedBanners,
    ///: BEGIN:ONLY_INCLUDE_IF(solana)
    selectedAccount,
    ///: END:ONLY_INCLUDE_IF
  ]);

  // Ensure activeSlideIndex is within bounds after filtering
  const safeActiveSlideIndex = Math.min(
    activeSlideIndex,
    visibleSlides.length - 1,
  );
  const currentSlide = visibleSlides[safeActiveSlideIndex];

  // Reset index if it's out of bounds
  useEffect(() => {
    if (activeSlideIndex >= visibleSlides.length && visibleSlides.length > 0) {
      setActiveSlideIndex(0);
    }
  }, [activeSlideIndex, visibleSlides.length]);

  // Function to animate gray box hiding with fold-up effect
  const animateGrayBoxHide = useCallback(() => {
    Animated.timing(grayBoxScaleY, {
      toValue: 0, // Collapse height from bottom to top
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Just hide the box, don't reset scale until we need to show it again
      setShowGrayBox(false);
    });
  }, [grayBoxScaleY]);

  // Function to show gray box (with reset)
  const showGrayBoxAnimated = useCallback(() => {
    // Reset scale to full size before showing
    grayBoxScaleY.setValue(1);
    setShowGrayBox(true);
  }, [grayBoxScaleY]);

  // Update gray box visibility based on available slides (but not during animations)
  useEffect(() => {
    if (!isAnimating.current) {
      const shouldShowGrayBox = safeActiveSlideIndex < visibleSlides.length - 1;

      if (!showGrayBox && shouldShowGrayBox) {
        // Show immediately when new slides become available
        showGrayBoxAnimated();
      }
      // Note: We don't auto-hide here anymore - handleClose manages hiding with animation
    }
  }, [
    safeActiveSlideIndex,
    visibleSlides.length,
    showGrayBox,
    showGrayBoxAnimated,
  ]);

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
      // Prevent multiple rapid clicks during animation
      if (isAnimating.current) {
        return;
      }

      // Calculate if there are more slides BEFORE dispatching the dismissal
      // This prevents race conditions caused by state updates
      const currentHasMoreSlides =
        safeActiveSlideIndex < visibleSlides.length - 1;

      isAnimating.current = true;

      if (currentHasMoreSlides) {
        // Check if this will be the last slide after dismissal
        const willBeLastSlide =
          safeActiveSlideIndex >= visibleSlides.length - 2;
        if (willBeLastSlide) {
          // Animate gray box hiding before slide transition
          animateGrayBoxHide();
        }

        // Step 1: Fade out current slide FIRST
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // Step 2: AFTER fade out is complete, dismiss the banner and show next slide
          dispatch(dismissBanner(slideId));

          // Step 3: Use requestAnimationFrame to ensure new slide is rendered
          requestAnimationFrame(() => {
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              isAnimating.current = false;
            });
          });
        });
      } else {
        // No more slides - fold up the entire carousel
        // First fade out the content
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // Dismiss banner
          dispatch(dismissBanner(slideId));

          // Then fold up the entire carousel
          Animated.timing(carouselScaleY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            // Hide carousel after fold animation completes
            setIsCarouselVisible(false);
            isAnimating.current = false;
          });
        });
      }
    },
    [
      dispatch,
      safeActiveSlideIndex,
      visibleSlides.length,
      fadeAnim,
      slideUpAnim,
      carouselScaleY,
      animateGrayBoxHide,
    ],
  );

  const renderCurrentSlideWithFade = useCallback(
    (slide: CarouselSlide) => (
      <Box
        key={slide.id}
        style={tw.style(
          'rounded-xl relative overflow-hidden border border-muted',
          {
            height: BANNER_HEIGHT,
            width: BANNER_WIDTH,
          },
        )}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
          }}
        >
          <Pressable
            testID={`carousel-slide-${slide.id}`}
            style={({ pressed }) =>
              tw.style(
                'bg-default rounded-xl px-4',
                {
                  height: BANNER_HEIGHT,
                  width: BANNER_WIDTH,
                },
                pressed && 'bg-default-pressed',
              )
            }
            onPress={() => handleSlideClick(slide.id, slide.navigation)}
          >
            <Box twClassName="w-full h-full flex-row gap-4 items-center">
              <Box
                style={tw.style(
                  'overflow-hidden justify-center items-center self-center rounded-xl bg-muted',
                  {
                    width: 72,
                    height: 72,
                  },
                )}
              >
                <RNImage
                  source={
                    slide.image ? { uri: slide.image } : { uri: undefined }
                  }
                  style={tw.style({ width: 72, height: 72 })}
                  resizeMode="contain"
                />
              </Box>
              <Box twClassName="flex-1 h-[72px] justify-start">
                <Box twClassName="flex-row items-center justify-between">
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    testID={`carousel-slide-${slide.id}-title`}
                    numberOfLines={1}
                  >
                    {slide.title}
                  </Text>
                  <ButtonIcon
                    iconName={IconName.Close}
                    size={ButtonIconSize.Sm}
                    onPress={() => handleClose(slide.id)}
                    testID={`carousel-slide-${slide.id}-close-button`}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  />
                </Box>
                <Box twClassName="pt-1">
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                    numberOfLines={2}
                  >
                    {slide.description}
                  </Text>
                </Box>
              </Box>
            </Box>
          </Pressable>
        </Animated.View>
      </Box>
    ),
    [tw, handleSlideClick, handleClose, fadeAnim],
  );

  // Track banner display events when visible slides change
  useEffect(() => {
    visibleSlides.forEach((slide: CarouselSlide) => {
      trackEvent(
        createEventBuilder({
          category: 'Banner Display',
          properties: {
            name: slide.variableName ?? slide.id,
          },
        }).build(),
      );
    });
  }, [visibleSlides, trackEvent, createEventBuilder]);

  // Track current slide display
  useEffect(() => {
    if (currentSlide) {
      trackEvent(
        createEventBuilder({
          category: 'Banner Display',
          properties: {
            name: currentSlide.variableName ?? currentSlide.id,
          },
        }).build(),
      );
    }
  }, [currentSlide, trackEvent, createEventBuilder]);

  if (
    !isCarouselVisible ||
    (visibleSlides.length === 0 && !isAnimating.current)
  ) {
    return null;
  }

  return (
    <Animated.View
      style={[
        tw.style('mx-4'),
        {
          transform: [
            { translateY: slideUpAnim },
            { scaleY: carouselScaleY },
            {
              translateY: carouselScaleY.interpolate({
                inputRange: [0, 1],
                outputRange: [-(BANNER_HEIGHT + 6) / 2, 0], // Center the fold animation
              }),
            },
          ],
        },
        style,
      ]}
    >
      <Box style={{ height: BANNER_HEIGHT + 6 }}>
        {showGrayBox && (
          <Animated.View
            style={[
              tw.style(
                'absolute mx-[6px] bg-background-default-pressed rounded-b-xl border-b border-l border-r border-muted',
                {
                  top: BANNER_HEIGHT - 2, // Position at bottom of main slide
                  height: 8, // Only show the 6px that should be visible
                  width: BANNER_WIDTH - 12,
                },
              ),
              {
                transform: [
                  { scaleY: grayBoxScaleY }, // Collapse from bottom to top
                  {
                    translateY: grayBoxScaleY.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-4, 0], // Move up slightly as it collapses to maintain bottom alignment
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        <Box style={{ height: BANNER_HEIGHT }}>
          <Box testID={WalletViewSelectorsIDs.CAROUSEL_CONTAINER}>
            {currentSlide ? (
              renderCurrentSlideWithFade(currentSlide)
            ) : (
              // Show empty card during fold animation
              <Box
                style={tw.style(
                  'rounded-xl relative overflow-hidden border border-muted',
                  {
                    height: BANNER_HEIGHT,
                    width: BANNER_WIDTH,
                  },
                )}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Animated.View>
  );
};

// Split memo component so we still see a Component name when profiling
export const Carousel = React.memo(CarouselComponent);
export default Carousel;
