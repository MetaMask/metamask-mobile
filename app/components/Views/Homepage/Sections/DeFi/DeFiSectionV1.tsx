import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
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
import { useDeFiPositionsForHomepage, DeFiPositionEntry } from './hooks';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import DeFiPositionsListItem from '../../../../UI/DeFiPositions/DeFiPositionsListItem';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useThrottledFocusEffect } from '../../../../hooks/useThrottledFocusEffect';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import {
  DeFiPositionsSkeleton,
  DeFiSectionProps,
  MAX_POSITIONS_DISPLAYED,
} from './DeFiSection.shared';

/**
 * DeFiSectionV1 - legacy DeFi positions homepage section.
 *
 * Hidden when empty; fetches on focus via the polling controller. Rendered by
 * {@link DeFiSection} when only the V1 flag is enabled.
 */
const DeFiSectionV1 = forwardRef<SectionRefreshHandle, DeFiSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const navigation = useNavigation<AppNavigationProp>();
    const privacyMode = useSelector(selectPrivacyMode);
    const title = strings('homepage.sections.defi');

    // Fetch on focus (throttled to 5 minutes) via the V1 polling controller.
    useThrottledFocusEffect(
      useCallback(() => {
        Engine.context.DeFiPositionsController?._executePoll()?.catch(
          () => undefined,
        );
      }, []),
      300_000,
    );

    const { positions, isLoading, hasError, isEmpty } =
      useDeFiPositionsForHomepage(MAX_POSITIONS_DISPLAYED);

    const handleViewAllDeFi = useCallback(() => {
      navigation.navigate(Routes.WALLET.DEFI_FULL_VIEW as never);
    }, [navigation]);

    const refresh = useCallback(async () => {
      await Engine.context.DeFiPositionsController._executePoll();
    }, []);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const sectionMountsVisibleRoot = !(isEmpty && !hasError && !isLoading);

    const { onLayout: homeViewedOnLayout } = useHomeViewedEvent({
      sectionRef: sectionMountsVisibleRoot ? sectionViewRef : null,
      isLoading,
      sectionName: HomeSectionNames.DEFI,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: isEmpty || hasError,
      itemCount: isEmpty ? 0 : positions.length,
      fireImmediateWhenNoView: false,
    });

    useSectionPerformance({
      sectionId: HomeSectionNames.DEFI,
      contentReady: !isLoading,
      isEmpty: isEmpty && !hasError,
      contentStateForTrace: hasError ? 'error' : undefined,
      isLoading,
      enabled: true,
    });

    // Hide when empty (and settled).
    if (!isLoading && isEmpty) {
      return null;
    }

    if (!isLoading && hasError) {
      return (
        <View ref={sectionViewRef} onLayout={homeViewedOnLayout}>
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

    return (
      <View ref={sectionViewRef} onLayout={homeViewedOnLayout}>
        <SectionDivider />
        <SectionHeader
          title={title}
          isInteractive
          onPress={handleViewAllDeFi}
          testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('defi')}
        />
        <SectionRow>
          {isLoading ? (
            <DeFiPositionsSkeleton />
          ) : (
            positions.map((position: DeFiPositionEntry) => (
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

DeFiSectionV1.displayName = 'DeFiSectionV1';

export default DeFiSectionV1;
