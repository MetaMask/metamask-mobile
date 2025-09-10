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

const CarouselComponent: FC<CarouselProps> = ({ style, onEmptyState }) => {
  const [priorityContentfulSlides, setPriorityContentfulSlides] = useState<
    CarouselSlide[]
  >([]);
  const [regularContentfulSlides, setRegularContentfulSlides] = useState<
    CarouselSlide[]
  >([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isCarouselVisible, setIsCarouselVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Current card animations (exit)
  const currentCardOpacity = useRef(new Animated.Value(1)).current;
  const currentCardScale = useRef(new Animated.Value(1)).current;
  const currentCardTranslateY = useRef(new Animated.Value(0)).current;

  // Next card animations (enter)
  const nextCardOpacity = useRef(new Animated.Value(0)).current;
  const nextCardScale = useRef(new Animated.Value(0.95)).current; // Starts slightly smaller
  const nextCardTranslateY = useRef(new Animated.Value(8)).current; // Starts slightly lower
  const nextCardBgOpacity = useRef(new Animated.Value(1)).current; // Background pressed state

  // Empty state animations
  const emptyStateOpacity = useRef(new Animated.Value(0)).current;
  const emptyStateScale = useRef(new Animated.Value(0.95)).current; // Same as next cards
  const emptyStateTranslateY = useRef(new Animated.Value(20)).current; // Starts below, fades up

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
  const nextSlide = visibleSlides[safeActiveSlideIndex + 1]; // Next card in stack
  const hasNextSlide = !!nextSlide;
  const isLastCard = !hasNextSlide && !!currentSlide; // Last card with empty state as "next"

  // Reset index if it's out of bounds
  useEffect(() => {
    if (activeSlideIndex >= visibleSlides.length && visibleSlides.length > 0) {
      setActiveSlideIndex(0);
    }
  }, [activeSlideIndex, visibleSlides.length]);

  // Reset card animations when slides change (but not during transitions or empty state display)
  useEffect(() => {
    // Skip entire useEffect during empty state display
    if (showEmptyState) {
      return;
    }

    if (!isAnimating.current && !isTransitioning) {
      // Use requestAnimationFrame to prevent flash during re-render
      requestAnimationFrame(() => {
        // Reset current card to visible state
        currentCardOpacity.setValue(1);
        currentCardScale.setValue(1);
        currentCardTranslateY.setValue(0);

        // Reset next card to background state (including empty state for last card)
        if (hasNextSlide || isLastCard) {
          // Always start next card invisible, then animate in
          nextCardOpacity.setValue(0); // Start invisible
          nextCardScale.setValue(0.95); // Slightly smaller
          nextCardTranslateY.setValue(8); // Slightly lower
          nextCardBgOpacity.setValue(1); // Pressed background state

          // Animate next card into background state
          Animated.timing(nextCardOpacity, {
            toValue: 0.7, // Fade to dimmed background state
            duration: 200,
            useNativeDriver: true,
          }).start();

          // For empty state specifically
          if (isLastCard) {
            emptyStateOpacity.setValue(0); // Start invisible
            emptyStateScale.setValue(0.95); // Same scale as next cards
            emptyStateTranslateY.setValue(8); // Slightly lower position

            // Animate empty state into background state
            Animated.timing(emptyStateOpacity, {
              toValue: 0.7, // Fade to dimmed background state
              duration: 200,
              useNativeDriver: true,
            }).start();
          }
        } else {
          nextCardOpacity.setValue(0);
          nextCardScale.setValue(0.95);
          nextCardTranslateY.setValue(8);
          nextCardBgOpacity.setValue(0);
          // Never reset empty state when it's being displayed
          if (!showEmptyState) {
            emptyStateOpacity.setValue(0);
            emptyStateScale.setValue(0.95);
            emptyStateTranslateY.setValue(20);
          }
        }
      });
    }
  }, [
    safeActiveSlideIndex,
    visibleSlides.length,
    hasNextSlide,
    isLastCard,
    isTransitioning,
    currentCardOpacity,
    currentCardScale,
    currentCardTranslateY,
    nextCardOpacity,
    nextCardScale,
    nextCardTranslateY,
    nextCardBgOpacity,
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

      isAnimating.current = true;
      setIsTransitioning(true);

      if (hasNextSlide || isLastCard) {
        // Overlapping card transition animation
        Animated.parallel([
          // Current card exit animation (fade + move up + scale up slightly)
          Animated.timing(currentCardOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(currentCardScale, {
            toValue: 1.015, // Slight scale up as it exits
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(currentCardTranslateY, {
            toValue: -8, // Move up slightly
            duration: 250,
            useNativeDriver: true,
          }),

          // Next card/empty state enter animation - starts with 50ms delay
          Animated.sequence([
            Animated.delay(50), // Slight overlap for natural feel
            Animated.parallel([
              // For normal next card
              ...(hasNextSlide
                ? [
                    Animated.timing(nextCardOpacity, {
                      toValue: 1,
                      duration: 200,
                      useNativeDriver: true,
                    }),
                    Animated.timing(nextCardScale, {
                      toValue: 1, // Scale to full size
                      duration: 200,
                      useNativeDriver: true,
                    }),
                    Animated.timing(nextCardTranslateY, {
                      toValue: 0, // Move to final position
                      duration: 200,
                      useNativeDriver: true,
                    }),
                  ]
                : []),

              // For empty state (when it's the last card)
              ...(isLastCard
                ? [
                    Animated.timing(emptyStateOpacity, {
                      toValue: 1, // From dimmed to full brightness
                      duration: 200,
                      useNativeDriver: true,
                    }),
                    Animated.timing(emptyStateScale, {
                      toValue: 1, // Scale to full size (same as next cards)
                      duration: 200,
                      useNativeDriver: true,
                    }),
                    Animated.timing(emptyStateTranslateY, {
                      toValue: 0, // Move to final position
                      duration: 200,
                      useNativeDriver: true,
                    }),
                  ]
                : []),

              // Background fade (applies to both next card and empty state)
              Animated.timing(nextCardBgOpacity, {
                toValue: 0, // Fade out pressed background
                duration: 200,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]).start(() => {
          // After animation, dismiss banner
          dispatch(dismissBanner(slideId));

          if (isLastCard) {
            // For empty state, trigger separate component and hide main carousel
            onEmptyState?.();
            setIsCarouselVisible(false);
            setIsTransitioning(false);
            isAnimating.current = false;
          } else {
            // For normal card transition
            requestAnimationFrame(() => {
              // Reset current card animations
              currentCardOpacity.setValue(1);
              currentCardScale.setValue(1);
              currentCardTranslateY.setValue(0);

              // Next card fade-in is handled by useEffect

              setIsTransitioning(false);
              isAnimating.current = false;
            });
          }
        });
      } else {
        // This should never happen now since we treat empty state as "next card"
        setIsCarouselVisible(false);
        isAnimating.current = false;
      }
    },
    [
      dispatch,
      hasNextSlide,
      isLastCard,
      currentCardOpacity,
      currentCardScale,
      currentCardTranslateY,
      nextCardOpacity,
      nextCardScale,
      nextCardTranslateY,
      nextCardBgOpacity,
      emptyStateOpacity,
      emptyStateScale,
      emptyStateTranslateY,
      carouselOpacity,
    ],
  );

  const renderEmptyStateCard = useCallback(
    () => (
      <Animated.View
        style={[
          tw.style('absolute'),
          {
            opacity: emptyStateOpacity,
            transform: [
              { scale: emptyStateScale },
              { translateY: emptyStateTranslateY },
            ],
          },
        ]}
      >
        <Box
          style={tw.style(
            'rounded-xl relative overflow-hidden border border-muted bg-default',
            {
              height: BANNER_HEIGHT,
              width: BANNER_WIDTH,
            },
          )}
        >
          {/* Animated pressed background overlay */}
          <Animated.View
            style={[
              tw.style('absolute inset-0 bg-default-pressed rounded-xl'),
              {
                opacity: nextCardBgOpacity,
              },
            ]}
          />
          <Box twClassName="w-full h-full flex justify-center items-center">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              testID="carousel-empty-state"
            >
              You're all caught up
            </Text>
          </Box>
        </Box>
      </Animated.View>
    ),
    [
      tw,
      emptyStateOpacity,
      emptyStateScale,
      emptyStateTranslateY,
      nextCardBgOpacity,
    ],
  );

  const renderCard = useCallback(
    (slide: CarouselSlide, isCurrentCard: boolean) => (
      <Animated.View
        key={slide.id}
        style={[
          tw.style('absolute'),
          {
            opacity: isCurrentCard ? currentCardOpacity : nextCardOpacity,
            transform: [
              {
                scale: isCurrentCard ? currentCardScale : nextCardScale,
              },
              {
                translateY: isCurrentCard
                  ? currentCardTranslateY
                  : nextCardTranslateY,
              },
            ],
          },
        ]}
      >
        <Box
          style={tw.style(
            'rounded-xl relative overflow-hidden border border-muted',
            {
              height: BANNER_HEIGHT,
              width: BANNER_WIDTH,
            },
          )}
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
            {/* Animated pressed background overlay for next card */}
            {!isCurrentCard && (
              <Animated.View
                style={[
                  tw.style('absolute bg-default-pressed rounded-xl'),
                  {
                    top: 1,
                    left: 1,
                    right: 1,
                    bottom: 1, // Inset by 1px to show border
                    opacity: nextCardBgOpacity,
                  },
                ]}
              />
            )}
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
        </Box>
      </Animated.View>
    ),
    [
      tw,
      handleSlideClick,
      handleClose,
      currentCardOpacity,
      currentCardScale,
      currentCardTranslateY,
      nextCardOpacity,
      nextCardScale,
      nextCardTranslateY,
      nextCardBgOpacity,
    ],
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
    (visibleSlides.length === 0 && !isAnimating.current && !showEmptyState)
  ) {
    return null;
  }

  return (
    <Animated.View
      style={[
        tw.style('mx-4'),
        {
          opacity: carouselOpacity, // Carousel fade for final exit
        },
        style,
      ]}
    >
      <Box style={{ height: BANNER_HEIGHT + 6 }}>
        <Box
          style={{ height: BANNER_HEIGHT, position: 'relative' }}
          testID={WalletViewSelectorsIDs.CAROUSEL_CONTAINER}
        >
          {/* Render next card first (behind current card) */}
          {nextSlide && renderCard(nextSlide, false)}

          {/* Render empty state card behind last card when it's the last card */}
          {isLastCard && renderEmptyStateCard()}

          {/* Render current card on top */}
          {currentSlide && renderCard(currentSlide, true)}
        </Box>
      </Box>
    </Animated.View>
  );
};

// Separate empty state component with its own lifecycle
const EmptyStateComponent: FC<{ style?: any }> = ({ style }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const height = useRef(new Animated.Value(BANNER_HEIGHT + 6)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const tw = useTailwind();

  useEffect(() => {
    // Wait 1 second, then fold up
    const timer = setTimeout(() => {
      setIsCollapsing(true);

      Animated.parallel([
        // Content fade out (starts immediately, 200ms)
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),

        // Height collapse (starts immediately, 300ms total)
        Animated.timing(height, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false, // Height needs layout thread
        }),

        // Visual carousel fold (starts after 50ms delay, 200ms duration)
        Animated.sequence([
          Animated.delay(50),
          Animated.timing(scaleY, {
            toValue: 0,
            duration: 200, // Completes at 250ms total
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setIsVisible(false);
      });
    }, 1000); // Reduced to 1 second

    return () => clearTimeout(timer);
  }, [opacity, height, scaleY]);

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        tw.style('mx-4'),
        {
          height, // Layout-affecting height for content shifting
          overflow: isCollapsing ? 'hidden' : 'visible',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          opacity,
          transform: [{ scaleY }],
        }}
      >
        <Box style={{ height: BANNER_HEIGHT + 6 }}>
          <Box style={{ height: BANNER_HEIGHT, position: 'relative' }}>
            <Box
              style={tw.style(
                'rounded-xl relative overflow-hidden border border-muted bg-default',
                {
                  height: BANNER_HEIGHT,
                  width: BANNER_WIDTH,
                },
              )}
            >
              <Box twClassName="w-full h-full flex justify-center items-center">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                  testID="carousel-empty-state"
                >
                  You're all caught up
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </Animated.View>
    </Animated.View>
  );
};

const CarouselWithEmptyState: FC<CarouselProps> = (props) => {
  const [showEmptyState, setShowEmptyState] = useState(false);

  // Pass down the empty state trigger
  const carouselProps = {
    ...props,
    onEmptyState: () => setShowEmptyState(true),
  };

  return (
    <>
      {!showEmptyState && <CarouselComponent {...carouselProps} />}
      {showEmptyState && <EmptyStateComponent style={props.style} />}
    </>
  );
};

// Split memo component so we still see a Component name when profiling
export const Carousel = React.memo(CarouselWithEmptyState);
export default Carousel;
