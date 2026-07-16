import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import {
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import SectionRow from '../../components/SectionRow';
import ErrorState from '../../components/ErrorState';
import { SectionRefreshHandle } from '../../types';
import {
  useDeFiPositionsForHomepage,
  useDeFiPositionsV2,
  DeFiPositionEntry,
} from './hooks';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import DeFiPositionsListItem from '../../../../UI/DeFiPositions/DeFiPositionsListItem';
import DeFiPositionsListItemV2 from '../../../../UI/DeFiPositions/DeFiPositionsListItemV2';
import { selectDeFiPositionsSectionEnabled } from '../../../../../selectors/deFiPositionsSectionEnabled';
import { selectDeFiPositionsV2SectionEnabled } from '../../../../../selectors/deFiPositionsV2SectionEnabled';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import useSectionViewportVisible from '../../hooks/useSectionViewportVisible';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';

const MAX_POSITIONS_DISPLAYED = 5;

interface DeFiSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * Skeleton placeholder for loading / idle state - matches DeFi list item layout.
 * Idle uses a shorter skeleton so the section stays measurable (≥30% viewport).
 */
const DeFiPositionsSkeleton = ({ rows = 3 }: { rows?: number }) => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      <View style={tw.style('gap-4')}>
        {Array.from({ length: rows }, (_, index) => (
          <View
            key={index}
            style={tw.style('flex-row items-center gap-5 py-2')}
          >
            <View style={tw.style('w-10 h-10 rounded-full')} />
            <View style={tw.style('flex-1 gap-1')}>
              <View style={tw.style('w-32 h-5 rounded')} />
              <View style={tw.style('w-24 h-4 rounded')} />
            </View>
            <View style={tw.style('items-end gap-1')}>
              <View style={tw.style('w-16 h-5 rounded')} />
              <View style={tw.style('w-12 h-4 rounded')} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPlaceholder>
  );
};

/**
 * DeFiSection - Displays user's DeFi positions on the homepage.
 *
 * V1: hidden when empty; fetches on focus via polling controller.
 * V2: always mounted while enabled (measurable placeholder while idle);
 * fetches only when scrolled into the viewport; collapses after a confirmed
 * empty fetch.
 */
const DeFiSection = forwardRef<SectionRefreshHandle, DeFiSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const navigation = useNavigation();
    const isV2Enabled = useSelector(selectDeFiPositionsV2SectionEnabled);
    const isV1Enabled = useSelector(selectDeFiPositionsSectionEnabled);
    const isDeFiEnabled = isV2Enabled || isV1Enabled;

    const privacyMode = useSelector(selectPrivacyMode);
    const title = strings('homepage.sections.defi');

    // V2: do not pass isLoading while idle, or visibility resets and never
    // triggers the first fetch (see plan §5 / useSectionViewportVisible).
    const { isVisible, onLayout: visibilityOnLayout } =
      useSectionViewportVisible(sectionViewRef, { isLoading: false });

    const {
      positions: v2Positions,
      isLoading: v2IsLoading,
      isError: v2IsError,
      hasFetched: v2HasFetched,
      refresh: refreshV2,
    } = useDeFiPositionsV2({
      enabled: isV2Enabled,
      isVisible: isV2Enabled && isVisible,
    });

    // V1 focus-poll — mutually exclusive with V2 viewport fetch.
    useFocusEffect(
      useCallback(() => {
        if (isV2Enabled || !isV1Enabled) {
          return;
        }
        Engine.context.DeFiPositionsController?._executePoll()?.catch(
          () => undefined,
        );
      }, [isV2Enabled, isV1Enabled]),
    );

    const {
      positions: v1Positions,
      isLoading: v1IsLoading,
      hasError: v1HasError,
      isEmpty: v1IsEmpty,
    } = useDeFiPositionsForHomepage(MAX_POSITIONS_DISPLAYED);

    const displayedV2Positions = useMemo(
      () =>
        [...v2Positions]
          .sort((a, b) => b.marketValue - a.marketValue)
          .slice(0, MAX_POSITIONS_DISPLAYED),
      [v2Positions],
    );

    const handleViewAllDeFi = useCallback(() => {
      navigation.navigate(Routes.WALLET.DEFI_FULL_VIEW as never);
    }, [navigation]);

    const refresh = useCallback(async () => {
      if (isV2Enabled) {
        await refreshV2();
        return;
      }
      const controller = Engine.context.DeFiPositionsController;
      await controller._executePoll();
    }, [isV2Enabled, refreshV2]);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const isLoading = isV2Enabled ? v2IsLoading : v1IsLoading;
    const hasError = isV2Enabled ? v2IsError : v1HasError;
    const isEmpty = isV2Enabled
      ? v2HasFetched &&
        !v2IsLoading &&
        !v2IsError &&
        displayedV2Positions.length === 0
      : v1IsEmpty;
    const itemCount = isV2Enabled
      ? displayedV2Positions.length
      : v1Positions.length;

    // V2 stays mounted while enabled until a completed fetch confirms empty.
    const sectionMountsVisibleRoot = isV2Enabled
      ? isDeFiEnabled && !isEmpty
      : isDeFiEnabled && !(isEmpty && !hasError && !isLoading);

    const { onLayout: homeViewedOnLayout } = useHomeViewedEvent({
      sectionRef: sectionMountsVisibleRoot ? sectionViewRef : null,
      isLoading,
      sectionName: HomeSectionNames.DEFI,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: isEmpty || hasError || !isDeFiEnabled,
      itemCount: isEmpty ? 0 : itemCount,
      fireImmediateWhenNoView: false,
    });

    const handleLayout = useCallback(() => {
      homeViewedOnLayout();
      if (isV2Enabled) {
        visibilityOnLayout();
      }
    }, [homeViewedOnLayout, isV2Enabled, visibilityOnLayout]);

    useSectionPerformance({
      sectionId: HomeSectionNames.DEFI,
      contentReady: !isLoading,
      isEmpty: isEmpty && !hasError,
      contentStateForTrace: hasError ? 'error' : undefined,
      isLoading,
      enabled: isDeFiEnabled,
    });

    if (!isDeFiEnabled) {
      return null;
    }

    // V1: hide when empty. V2: hide only after a confirmed empty fetch.
    if (!isLoading && isEmpty) {
      return null;
    }

    if (!isLoading && hasError) {
      return (
        <View ref={sectionViewRef} onLayout={handleLayout}>
          <SectionDivider />
          <SectionHeader
            title={title}
            isInteractive
            onPress={handleViewAllDeFi}
            testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('defi')}
          />
          <ErrorState
            title={strings('homepage.error.unable_to_load', {
              section: title.toLowerCase(),
            })}
            onRetry={refresh}
          />
        </View>
      );
    }

    const showIdlePlaceholder =
      isV2Enabled && !v2HasFetched && !v2IsLoading && !v2IsError;

    return (
      <View ref={sectionViewRef} onLayout={handleLayout}>
        <SectionDivider />
        <SectionHeader
          title={title}
          isInteractive
          onPress={handleViewAllDeFi}
          testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('defi')}
        />
        <SectionRow>
          {isLoading || showIdlePlaceholder ? (
            <DeFiPositionsSkeleton rows={showIdlePlaceholder ? 1 : 3} />
          ) : isV2Enabled ? (
            displayedV2Positions.map((position) => (
              <DeFiPositionsListItemV2
                key={`${position.chainId}-${position.protocolId}`}
                position={position}
                privacyMode={privacyMode}
              />
            ))
          ) : (
            v1Positions.map((position: DeFiPositionEntry) => (
              <DeFiPositionsListItem
                key={`${position.chainId}-${position.protocolAggregate.protocolDetails.name}`}
                chainId={position.chainId}
                protocolId={position.protocolId}
                protocolAggregate={position.protocolAggregate}
                privacyMode={privacyMode}
              />
            ))
          )}
        </SectionRow>
      </View>
    );
  },
);

export default DeFiSection;
