import React, {
  useState,
  useCallback,
  FC,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { Dimensions, Animated, Linking } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  CarouselProps,
  CarouselSlide,
  NavigationAction,
  NavigationRoute,
} from './types';
import { dismissBanner } from '../../../reducers/banners';
import { StackCard } from './StackCard';
import { StackCardEmpty } from './StackCardEmpty';
import { useTransitionToNextCard, useTransitionToEmpty } from './animations';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
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
import { subscribeToContentPreviewToken } from '../../../actions/notification/helpers';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/DeeplinkManager';
import { isInternalDeepLink } from '../../../util/deeplinks';
import AppConstants from '../../../core/AppConstants';
import { RootParamList } from '../../../util/navigation/types';

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

export function useFetchCarouselSlides() {
  const isContentfulCarouselEnabled = useSelector(
    selectContentfulCarouselEnabledFlag,
  );

  const [priorityContentfulSlides, setPriorityContentfulSlides] = useState<
    CarouselSlide[]
  >([]);
  const [regularContentfulSlides, setRegularContentfulSlides] = useState<
    CarouselSlide[]
  >([]);

  const fetchCallback = useCallback(async () => {
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
  }, [isContentfulCarouselEnabled]);

  useEffect(() => {
    // initial fetch
    fetchCallback();

    // refetch from preview token
    const unsubscribe = subscribeToContentPreviewToken(fetchCallback);
    return () => {
      unsubscribe();
    };
  }, [fetchCallback, isContentfulCarouselEnabled]);

  return {
    priorityContentfulSlides,
    regularContentfulSlides,
  };
}

const CarouselComponent: FC<CarouselProps> = ({ style, onEmptyState }) => {
  const { priorityContentfulSlides, regularContentfulSlides } =
    useFetchCarouselSlides();

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isCarouselVisible, setIsCarouselVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Current card animations (exit)
  const currentCardOpacity = useRef(new Animated.Value(1)).current;
  const currentCardScale = useRef(new Animated.Value(1)).current;
  const currentCardTranslateY = useRef(new Animated.Value(0)).current;

  // Next card animations (enter)
  const nextCardOpacity = useRef(new Animated.Value(0)).current;
  const nextCardScale = useRef(new Animated.Value(0.96)).current; // Starts slightly smaller
  const nextCardTranslateY = useRef(new Animated.Value(8)).current; // Starts slightly lower
  const nextCardBgOpacity = useRef(new Animated.Value(1)).current; // Background pressed state

  // Carousel-level animations for empty state dismissal
  const carouselOpacity = useRef(new Animated.Value(1)).current;
  const carouselHeight = useRef(new Animated.Value(BANNER_HEIGHT + 6)).current;
  const carouselScaleY = useRef(new Animated.Value(1)).current;

  const isAnimating = useRef(false);

  // Ref to track if we're mid-animation on the last card
  const dismissingLastCardRef = useRef(false);

  // Animation hooks
  const transitionToNextCard = useTransitionToNextCard({
    currentCardOpacity,
    currentCardScale,
    currentCardTranslateY,
    nextCardOpacity,
    nextCardScale,
    nextCardTranslateY,
    nextCardBgOpacity,
  });

  const transitionToEmpty = useTransitionToEmpty({
    carouselOpacity,
    emptyCardOpacity: currentCardOpacity, // Empty card uses current card opacity when active
    carouselHeight,
    carouselScaleY,
  });

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
    let slides: CarouselSlide[] = [];

    // Get base slides
    const patch = (s: CarouselSlide): CarouselSlide => {
      const withNav = applyLocalNavigation(s);
      if (withNav.variableName === 'fund' && isZeroBalance) {
        return { ...withNav, undismissable: withNav.undismissable || true };
      }
      return withNav;
    };

    const priority = priorityContentfulSlides.map(patch);
    const regular = orderByCardPlacement(regularContentfulSlides.map(patch));
    slides = [...priority, ...regular];

    // Check if there are any non-dismissed slides (or if we're in the final dismissal flow)
    const hasNonDismissedSlides = slides.some(
      (s) => !dismissedBanners.includes(s.id),
    );
    const shouldAddEmpty =
      hasNonDismissedSlides || dismissingLastCardRef.current;

    // Add empty card only if there are non-dismissed slides or during dismissal animation
    if (shouldAddEmpty && slides.length > 0) {
      const emptyCard: CarouselSlide = {
        id: `empty-card-${Date.now()}`,
        title: '',
        description: '',
        navigation: {
          type: 'url',
          href: '#',
        },
        variableName: 'empty',
        undismissable: true,
      };
      slides.push(emptyCard);
    }

    return slides;
  }, [
    applyLocalNavigation,
    isZeroBalance,
    priorityContentfulSlides,
    regularContentfulSlides,
    dismissedBanners,
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

    // If we're in the middle of dismissing the last card,
    // keep the empty card in visibleSlides so the animation completes
    if (dismissingLastCardRef.current && filtered.length === 0) {
      // Re-add the empty card so the animation completes
      const emptyCards = slidesConfig.filter((s) => s.variableName === 'empty');
      return emptyCards.length > 0 ? emptyCards : [];
    }

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

  // Reset index if it's out of bounds
  useEffect(() => {
    if (activeSlideIndex >= visibleSlides.length && visibleSlides.length > 0) {
      setActiveSlideIndex(0);
    }
  }, [activeSlideIndex, visibleSlides.length]);

  // Reset card animations when slides change (but not during transitions)
  useEffect(() => {
    if (!isAnimating.current && !isTransitioning) {
      // Use requestAnimationFrame to prevent flash during re-render
      requestAnimationFrame(() => {
        // Reset current card to visible state
        currentCardOpacity.setValue(1);
        currentCardScale.setValue(1);
        currentCardTranslateY.setValue(0);

        // Reset next card to background state
        if (hasNextSlide) {
          // For initial setup only - transition completion handles new next cards
          nextCardOpacity.setValue(0.7); // Dimmed background state
          nextCardScale.setValue(0.96); // Slightly smaller
          nextCardTranslateY.setValue(8); // Slightly lower
          nextCardBgOpacity.setValue(1); // Pressed background state
        } else {
          nextCardOpacity.setValue(0);
          nextCardScale.setValue(0.96);
          nextCardTranslateY.setValue(8);
          nextCardBgOpacity.setValue(0);
        }
      });
    }
  }, [
    safeActiveSlideIndex,
    visibleSlides.length,
    hasNextSlide,
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
    (href: string): (() => Promise<boolean>) =>
    () => {
      // Check if this is an internal MetaMask deeplink
      if (isInternalDeepLink(href)) {
        // Handle internal deeplinks through SharedDeeplinkManager
        return SharedDeeplinkManager.getInstance()
          .parse(href, {
            origin: AppConstants.DEEPLINKS.ORIGIN_CAROUSEL,
          })
          .catch((error) => {
            console.error('Failed to handle internal deeplink:', error);
            return false;
          });
      }

      // For external URLs, use the OS linking system
      return Linking.openURL(href)
        .then(() => true)
        .catch((error) => {
          console.error('Failed to open external URL:', error);
          return false;
        });
    };

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
        return (navigate as unknown as (...args: NavigationRoute) => void)(
          ...navigation.navigate(),
        );
      }

      if (navigation.type === 'route') {
        return (navigate as (screen: keyof RootParamList) => void)(
          navigation.route,
        );
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

  const handleTransitionToNextCard = useCallback(
    async (slideId: string) => {
      if (isAnimating.current) return;

      isAnimating.current = true;
      setIsTransitioning(true);

      // Check if next card is the empty card (last non-empty slide being dismissed)
      const isNextCardEmpty = nextSlide?.variableName === 'empty';

      // Set flag to keep empty card visible during dismissal animation
      if (isNextCardEmpty) {
        dismissingLastCardRef.current = true;
      }

      try {
        await transitionToNextCard.executeTransition('nextCard');

        // After animation, dismiss banner immediately so Redux knows it's gone
        dispatch(dismissBanner(slideId));

        // Set up animations based on what's next
        requestAnimationFrame(() => {
          if (isNextCardEmpty) {
            // Empty card is now current - set it to full visibility
            currentCardOpacity.setValue(1);
            currentCardScale.setValue(1);
            currentCardTranslateY.setValue(0);

            // No next card after empty
            nextCardOpacity.setValue(0);
            nextCardScale.setValue(0.96);
            nextCardTranslateY.setValue(8);
            nextCardBgOpacity.setValue(0);
          } else {
            // Regular transition - set up new next card if there will be one
            if (safeActiveSlideIndex < visibleSlides.length - 2) {
              nextCardOpacity.setValue(0.7);
              nextCardScale.setValue(0.96);
              nextCardTranslateY.setValue(8);
              nextCardBgOpacity.setValue(1);
            }

            currentCardOpacity.setValue(1);
            currentCardScale.setValue(1);
            currentCardTranslateY.setValue(0);
          }

          setIsTransitioning(false);
          isAnimating.current = false;
        });
      } catch (error) {
        console.error('Transition to next card failed:', error);
        dismissingLastCardRef.current = false;
        setIsTransitioning(false);
        isAnimating.current = false;
      }
    },
    [
      transitionToNextCard,
      dispatch,
      safeActiveSlideIndex,
      visibleSlides.length,
      nextSlide,
      currentCardOpacity,
      currentCardScale,
      currentCardTranslateY,
      nextCardBgOpacity,
      nextCardOpacity,
      nextCardScale,
      nextCardTranslateY,
    ],
  );

  const handleTransitionToEmpty = useCallback(async () => {
    if (isAnimating.current) return;

    isAnimating.current = true;

    try {
      // Trigger empty state component (fold-up and remove carousel)
      await transitionToEmpty.executeTransition(() => {
        // Reset the flag here to indicate that the last card has finished dismissing.
        // This must happen inside the transition callback to ensure the animation and
        // state are synchronized. If this flag were not reset at this point, future
        // transitions to the empty state would be blocked, causing the carousel to get
        // stuck and preventing further dismissals or animations.
        dismissingLastCardRef.current = false;
        onEmptyState?.();
        setIsCarouselVisible(false);
      });

      isAnimating.current = false;
    } catch (error) {
      console.error('Transition to empty failed:', error);
      dismissingLastCardRef.current = false;
      isAnimating.current = false;
    }
  }, [transitionToEmpty, onEmptyState]);

  const renderCard = useCallback(
    (slide: CarouselSlide, isCurrentCard: boolean) => {
      const isEmptyCard = slide.variableName === 'empty';

      if (isEmptyCard) {
        return (
          <StackCardEmpty
            emptyStateOpacity={
              isCurrentCard ? currentCardOpacity : nextCardOpacity
            }
            emptyStateScale={isCurrentCard ? currentCardScale : nextCardScale}
            emptyStateTranslateY={
              isCurrentCard ? currentCardTranslateY : nextCardTranslateY
            }
            nextCardBgOpacity={nextCardBgOpacity}
            onTransitionToEmpty={
              isCurrentCard ? () => handleTransitionToEmpty() : undefined
            }
          />
        );
      }

      return (
        <StackCard
          slide={slide}
          isCurrentCard={isCurrentCard}
          currentCardOpacity={currentCardOpacity}
          currentCardScale={currentCardScale}
          currentCardTranslateY={currentCardTranslateY}
          nextCardOpacity={nextCardOpacity}
          nextCardScale={nextCardScale}
          nextCardTranslateY={nextCardTranslateY}
          nextCardBgOpacity={nextCardBgOpacity}
          onSlideClick={handleSlideClick}
          onTransitionToNextCard={() => handleTransitionToNextCard(slide.id)}
        />
      );
    },
    [
      currentCardOpacity,
      currentCardScale,
      currentCardTranslateY,
      nextCardOpacity,
      nextCardScale,
      nextCardTranslateY,
      nextCardBgOpacity,
      handleSlideClick,
      handleTransitionToNextCard,
      handleTransitionToEmpty,
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
    (visibleSlides.length === 0 && !isAnimating.current)
  ) {
    return null;
  }

  return (
    <Animated.View
      style={[
        tw.style('mx-4'),
        {
          height: carouselHeight, // Layout animation (non-native)
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          opacity: carouselOpacity,
          transform: [{ scaleY: carouselScaleY }], // Native animations
        }}
      >
        <Box style={{ height: BANNER_HEIGHT + 6 }}>
          <Box
            style={tw.style('relative', { height: BANNER_HEIGHT })}
            testID={WalletViewSelectorsIDs.CAROUSEL_CONTAINER}
          >
            {/* Layer 1: Render future next card first (Card 3 - deepest layer) */}
            {isTransitioning && (
              <>
                {/* Regular future next card */}
                {visibleSlides[safeActiveSlideIndex + 2] && (
                  <Box
                    key={`future-${visibleSlides[safeActiveSlideIndex + 2].id}`}
                    style={tw.style('absolute', {
                      opacity: 0.7,
                      transform: [{ scale: 0.96 }, { translateY: 8 }],
                      zIndex: 1, // Ensure it's behind other cards
                    })}
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
                      {/* Pressed background overlay */}
                      <Box
                        style={tw.style(
                          'absolute bg-default-pressed rounded-xl',
                          {
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                          },
                        )}
                      />
                      {/* Simplified content - just show it's there */}
                      <Box twClassName="w-full h-full flex justify-center items-center">
                        <Text
                          variant={TextVariant.BodyXs}
                          color={TextColor.TextAlternative}
                        >
                          Next card
                        </Text>
                      </Box>
                    </Box>
                  </Box>
                )}
              </>
            )}

            {/* Layer 2: Render next card (Card 2 - middle layer) */}
            {nextSlide && renderCard(nextSlide, false)}

            {/* Layer 3: Render current card on top (Card 1 - top layer) */}
            {currentSlide && renderCard(currentSlide, true)}
          </Box>
        </Box>
      </Animated.View>
    </Animated.View>
  );
};

// Split memo component so we still see a Component name when profiling
export const Carousel = React.memo(CarouselComponent);
export default Carousel;
