import React, { useCallback, useRef, useState, useMemo } from 'react';
import { StatusBar, BackHandler, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import PagerView, {
  PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { TokenStoryViewProps } from './TokenStoryView.types';
import TokenStoryCard from './TokenStoryCard';
import TokenStoryIndicator from './TokenStoryIndicator';
import { selectSortedAssetsBySelectedAccountGroup, selectAsset } from '../../../../selectors/assets/assets-list';
import { RootState } from '../../../../reducers';
import { TokenI } from '../types';
import { TraceName, trace } from '../../../../util/trace';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

/**
 * TokenStoryView - A full-screen vertical swipe navigation for browsing token holdings.
 *
 * Similar to Instagram Stories, users can swipe up/down to navigate between tokens.
 * Each page shows a full-screen token card with balance information.
 *
 * @example
 * ```tsx
 * <TokenStoryView
 *   initialIndex={0}
 *   onClose={() => navigation.goBack()}
 * />
 * ```
 */
const TokenStoryView = ({ initialIndex = 0, onClose }: TokenStoryViewProps) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { trackEvent, createEventBuilder } = useMetrics();

  // Get token list from Redux
  const tokenKeys = useSelector(selectSortedAssetsBySelectedAccountGroup);

  // Current page tracking
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const pagerRef = useRef<PagerView>(null);

  // Handle page change
  const handlePageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const newIndex = event.nativeEvent.position;
      setCurrentIndex(newIndex);

      // Track page view
      const key = tokenKeys[newIndex];
      if (key) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_OPENED)
            .addProperties({
              source: 'token-story-view',
              chain_id: key.chainId,
              token_address: key.address,
              page_index: newIndex,
            })
            .build(),
        );
      }
    },
    [tokenKeys, trackEvent, createEventBuilder],
  );

  // Handle close
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  }, [onClose, navigation]);

  // Handle back button on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleClose();
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [handleClose]),
  );

  // Navigate to full token details
  const handleViewDetails = useCallback(
    (token: TokenI) => {
      trace({ name: TraceName.AssetDetails });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_OPENED)
          .addProperties({
            source: 'token-story-view-details',
            chain_id: token.chainId,
            token_symbol: token.symbol,
          })
          .build(),
      );

      navigation.navigate('Asset', {
        ...token,
      });
    },
    [navigation, trackEvent, createEventBuilder],
  );

  // Memoize the page views to prevent unnecessary re-renders
  const pages = useMemo(
    () =>
      tokenKeys.map((key, index) => (
        <TokenStoryPageWrapper
          key={`${key.address}-${key.chainId}-${key.isStaked}`}
          tokenKey={key}
          index={index}
          totalCount={tokenKeys.length}
          isActive={index === currentIndex}
          onViewDetails={handleViewDetails}
        />
      )),
    [tokenKeys, currentIndex, handleViewDetails],
  );

  // If no tokens, show empty state
  if (tokenKeys.length === 0) {
    return (
      <Box twClassName="flex-1 bg-default items-center justify-center">
        <Icon
          name={IconName.Wallet}
          size={IconSize.Xl}
          color={IconColor.Muted}
        />
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1 bg-default">
      <StatusBar barStyle="light-content" />

      {/* Close button */}
      <Animated.View
        entering={FadeIn.delay(300).duration(200)}
        style={[
          tw.style('absolute z-20'),
          { top: insets.top + 10, left: 16 },
        ]}
      >
        <Pressable
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) =>
            tw.style(
              'w-10 h-10 rounded-full bg-muted items-center justify-center',
              pressed && 'opacity-70',
            )
          }
        >
          <Icon
            name={IconName.Close}
            size={IconSize.Md}
            color={IconColor.Default}
          />
        </Pressable>
      </Animated.View>

      {/* Page indicator */}
      <TokenStoryIndicator
        currentIndex={currentIndex}
        totalCount={tokenKeys.length}
      />

      {/* Vertical Pager */}
      <AnimatedPagerView
        ref={pagerRef}
        style={tw.style('flex-1')}
        initialPage={initialIndex}
        orientation="vertical"
        onPageSelected={handlePageSelected}
        overdrag
        offscreenPageLimit={1}
      >
        {pages}
      </AnimatedPagerView>
    </Box>
  );
};

/**
 * Wrapper component for each token page to handle data fetching
 */
interface TokenStoryPageWrapperProps {
  tokenKey: { address: string; chainId: string; isStaked: boolean };
  index: number;
  totalCount: number;
  isActive: boolean;
  onViewDetails: (token: TokenI) => void;
}

const TokenStoryPageWrapper = React.memo(
  ({
    tokenKey,
    index,
    totalCount,
    isActive,
    onViewDetails,
  }: TokenStoryPageWrapperProps) => {
    const token = useSelector((state: RootState) =>
      selectAsset(state, {
        address: tokenKey.address,
        chainId: tokenKey.chainId,
        isStaked: tokenKey.isStaked,
      }),
    );

    const handleViewDetails = useCallback(() => {
      if (token) {
        onViewDetails(token);
      }
    }, [token, onViewDetails]);

    if (!token) {
      return <Box twClassName="flex-1 bg-default" />;
    }

    return (
      <TokenStoryCard
        token={token}
        isActive={isActive}
        onViewDetails={handleViewDetails}
        index={index}
        totalCount={totalCount}
      />
    );
  },
);

TokenStoryPageWrapper.displayName = 'TokenStoryPageWrapper';

export default TokenStoryView;
