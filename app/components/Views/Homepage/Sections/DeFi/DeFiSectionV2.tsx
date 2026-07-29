import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import SectionRow from '../../components/SectionRow';
import ErrorState from '../../components/ErrorState';
import { SectionRefreshHandle } from '../../types';
import { useDeFiPositionsV2 } from './hooks';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import DeFiPositionsListItemV2 from '../../../../UI/Assets/DeFiPositions/components/DeFiPositionsListItemV2';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import useSectionViewportVisible from '../../hooks/useSectionViewportVisible';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import {
  DeFiPositionsSkeleton,
  DeFiSectionProps,
  MAX_POSITIONS_DISPLAYED,
} from './DeFiSection.shared';

/**
 * DeFiSectionV2 - DeFi positions homepage section backed by the on-demand V2
 * controller.
 *
 * Always mounted while enabled (measurable placeholder while idle); fetches
 * only when scrolled into the viewport; collapses after a confirmed empty
 * fetch. Rendered by {@link DeFiSection} when the V2 flag is enabled.
 */
const DeFiSectionV2 = forwardRef<SectionRefreshHandle, DeFiSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const navigation = useNavigation<AppNavigationProp>();
    const privacyMode = useSelector(selectPrivacyMode);
    const title = strings('homepage.sections.defi');

    // Do not pass isLoading while idle, or visibility resets and never triggers
    // the first fetch (see plan §5 / useSectionViewportVisible).
    const { isVisible, onLayout: visibilityOnLayout } =
      useSectionViewportVisible(sectionViewRef, { isLoading: false });

    const {
      positions,
      isLoading,
      isError,
      hasFetched,
      refresh: refreshV2,
    } = useDeFiPositionsV2({ enabled: true, isVisible });

    const displayedPositions = useMemo(
      () =>
        [...positions]
          .sort((a, b) => b.marketValue - a.marketValue)
          .slice(0, MAX_POSITIONS_DISPLAYED),
      [positions],
    );

    const handleViewAllDeFi = useCallback(() => {
      navigation.navigate(Routes.WALLET.DEFI_FULL_VIEW as never);
    }, [navigation]);

    const refresh = useCallback(async () => {
      await refreshV2();
    }, [refreshV2]);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const isEmpty =
      hasFetched && !isLoading && !isError && displayedPositions.length === 0;

    // Stays mounted while enabled until a completed fetch confirms empty.
    const sectionMountsVisibleRoot = !isEmpty;

    const { onLayout: homeViewedOnLayout } = useHomeViewedEvent({
      sectionRef: sectionMountsVisibleRoot ? sectionViewRef : null,
      isLoading,
      sectionName: HomeSectionNames.DEFI,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: isEmpty || isError,
      itemCount: isEmpty ? 0 : displayedPositions.length,
      fireImmediateWhenNoView: false,
    });

    const handleLayout = useCallback(() => {
      homeViewedOnLayout();
      visibilityOnLayout();
    }, [homeViewedOnLayout, visibilityOnLayout]);

    useSectionPerformance({
      sectionId: HomeSectionNames.DEFI,
      contentReady: !isLoading,
      isEmpty: isEmpty && !isError,
      contentStateForTrace: isError ? 'error' : undefined,
      isLoading,
      enabled: true,
    });

    // Collapse only after a completed empty fetch.
    if (!isLoading && isEmpty) {
      return null;
    }

    if (!isLoading && isError) {
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

    const showIdlePlaceholder = !hasFetched && !isLoading && !isError;

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
          ) : (
            displayedPositions.map((position) => (
              <DeFiPositionsListItemV2
                key={`${position.chainId}-${position.protocolId}`}
                position={position}
                privacyMode={privacyMode}
              />
            ))
          )}
        </SectionRow>
      </View>
    );
  },
);

DeFiSectionV2.displayName = 'DeFiSectionV2';

export default DeFiSectionV2;
