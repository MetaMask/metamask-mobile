import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import { SectionRefreshHandle } from '../../types';
import { useDeFiPositionsForHomepage, DeFiPositionEntry } from './hooks';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import DeFiPositionsListItem from '../../../../UI/DeFiPositions/DeFiPositionsListItem';
import { selectAssetsDefiPositionsEnabled } from '../../../../../selectors/featureFlagController/assetsDefiPositions';
import { strings } from '../../../../../../locales/i18n';

const MAX_POSITIONS_DISPLAYED = 5;

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
const DeFiSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const isDeFiEnabled = useSelector(selectAssetsDefiPositionsEnabled);
  const privacyMode = useSelector(selectPrivacyMode);
  const title = strings('homepage.sections.defi');

  const { positions, isLoading, hasError, isEmpty } =
    useDeFiPositionsForHomepage(MAX_POSITIONS_DISPLAYED);

  // DeFi positions come from Redux selectors - no async refresh needed
  const refresh = useCallback(async () => {
    // Data refreshes automatically via DeFiPositionsController
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  // Don't render if DeFi is disabled
  if (!isDeFiEnabled) {
    return null;
  }

  // Don't render if error or empty (and not loading)
  if (!isLoading && (hasError || isEmpty)) {
    return null;
  }

  return (
    <Box gap={3}>
      <SectionTitle title={title} />
      <SectionRow>
        <Box>
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
        </Box>
      </SectionRow>
    </Box>
  );
});

export default DeFiSection;
