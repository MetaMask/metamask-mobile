import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import SectionRow from '../../components/SectionRow';
import ErrorState from '../../components/ErrorState';
import { SectionRefreshHandle } from '../../types';
import { useDeFiPositionsForHomepage, DeFiPositionEntry } from './hooks';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import DeFiPositionsListItem from '../../../../UI/DeFiPositions/DeFiPositionsListItem';
import { selectDeFiPositionsSectionEnabled } from '../../../../../selectors/deFiPositionsSectionEnabled';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';

const MAX_POSITIONS_DISPLAYED = 5;

const styles = StyleSheet.create({
  sectionGap: { gap: 12 },
});

interface DeFiSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * Skeleton placeholder for loading state - matches DeFi list item layout
 */
const DeFiPositionsSkeleton = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      <View style={tw.style('gap-4')}>
        {Array.from({ length: 3 }, (_, index) => (
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
 * Only renders if the user has DeFi positions.
 * Uses Redux state from DeFiPositionsController.
 */
const DeFiSection = forwardRef<SectionRefreshHandle, DeFiSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const navigation = useNavigation();
    const isDeFiEnabled = useSelector(selectDeFiPositionsSectionEnabled);

    useFocusEffect(
      useCallback(() => {
        if (!isDeFiEnabled) {
          return;
        }
        Engine.context.DeFiPositionsController?._executePoll()?.catch(
          () => undefined,
        );
      }, [isDeFiEnabled]),
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
      // Align with other sections: loading finished without error = ready (empty is success + content_state empty).
      contentReady: !isLoading && !hasError,
      isEmpty: isEmpty || hasError,
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
        <View
          ref={sectionViewRef}
          onLayout={onLayout}
          style={styles.sectionGap}
        >
          <SectionHeader
            title={title}
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
      <View ref={sectionViewRef} onLayout={onLayout} style={styles.sectionGap}>
        <SectionHeader
          title={title}
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

export default DeFiSection;
