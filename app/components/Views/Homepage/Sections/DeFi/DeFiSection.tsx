import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import {
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import SectionRow from '../../components/SectionRow';
import ErrorState from '../../components/ErrorState';
import { SectionRefreshHandle } from '../../types';
import { useDeFiPositionsForHomepage, DeFiPositionEntry } from './hooks';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import DeFiPositionsListItem from '../../../../UI/DeFiPositions/DeFiPositionsListItem';
import { selectDeFiPositionsSectionEnabled } from '../../../../../selectors/deFiPositionsSectionEnabled';
import { selectDeFiPositionsV2SectionEnabled } from '../../../../../selectors/deFiPositionsV2SectionEnabled';
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
import DeFiSectionV2 from './DeFiSectionV2';

/**
 * DeFiSectionV1 - Displays user's DeFi positions on the homepage.
 *
 * Only renders if the user has DeFi positions.
 * Uses Redux state from DeFiPositionsController.
 */
const DeFiSectionV1 = forwardRef<SectionRefreshHandle, DeFiSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const navigation = useNavigation<AppNavigationProp>();
    const isDeFiEnabled = useSelector(selectDeFiPositionsSectionEnabled);

    // TODO(ASSETS-3658): Replace with a proper polling mechanism in DeFiPositionsController.
    useThrottledFocusEffect(
      useCallback(() => {
        if (!isDeFiEnabled) return;
        Engine.context.DeFiPositionsController?._executePoll()?.catch(
          () => undefined,
        );
      }, [isDeFiEnabled]),
      300_000, // 5 minutes
    );
    const privacyMode = useSelector(selectPrivacyMode);
    const title = strings('homepage.sections.defi');

    const { positions, isLoading, hasError, isEmpty } =
      useDeFiPositionsForHomepage(MAX_POSITIONS_DISPLAYED);

    const handleViewAllDeFi = useCallback(() => {
      navigation.navigate(Routes.WALLET.DEFI_FULL_VIEW as never);
    }, [navigation]);

    const refresh = useCallback(async () => {
      const controller = Engine.context.DeFiPositionsController;
      await controller._executePoll();
    }, []);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    // Only attach a ref when this section mounts a root View (loading skeleton,
    // error UI, or positions). When empty after load we return null — pass null
    // here and disable the hook's immediate-fire path so HOME_VIEWED is not sent.
    const sectionMountsVisibleRoot =
      isDeFiEnabled && !(isEmpty && !hasError && !isLoading);

    const { onLayout } = useHomeViewedEvent({
      sectionRef: sectionMountsVisibleRoot ? sectionViewRef : null,
      isLoading,
      sectionName: HomeSectionNames.DEFI,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: isEmpty || hasError || !isDeFiEnabled,
      itemCount: isEmpty ? 0 : positions.length,
      fireImmediateWhenNoView: false,
    });

    useSectionPerformance({
      sectionId: HomeSectionNames.DEFI,
      contentReady: !isLoading,
      isEmpty: isEmpty && !hasError,
      contentStateForTrace: hasError ? 'error' : undefined,
      isLoading,
      enabled: isDeFiEnabled,
    });

    // Don't render if DeFi is disabled
    if (!isDeFiEnabled) {
      return null;
    }

    // Don't render if empty and not loading (200 with no data)
    if (!isLoading && isEmpty) {
      return null;
    }

    // Show retry UI on error
    if (!isLoading && hasError) {
      return (
        <View ref={sectionViewRef} onLayout={onLayout}>
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
      <View ref={sectionViewRef} onLayout={onLayout}>
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

/**
 * DeFiSection - homepage DeFi positions section.
 *
 * Feature-flag switch: renders the V2 implementation when the V2 flag is on,
 * otherwise the (unchanged) V1 implementation. V1 keeps its own
 * enablement/empty gating, so it returns null when neither flag is active.
 */
const DeFiSection = forwardRef<SectionRefreshHandle, DeFiSectionProps>(
  (props, ref) => {
    const isV2Enabled = useSelector(selectDeFiPositionsV2SectionEnabled);

    return isV2Enabled ? (
      <DeFiSectionV2 ref={ref} {...props} />
    ) : (
      <DeFiSectionV1 ref={ref} {...props} />
    );
  },
);

DeFiSection.displayName = 'DeFiSection';

export default DeFiSection;
