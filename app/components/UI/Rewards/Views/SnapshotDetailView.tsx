import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import SnapshotTile from '../components/SnapshotTile';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useSnapshots } from '../hooks/useSnapshots';
import { SnapshotDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import useRewardsToast from '../hooks/useRewardsToast';
import Routes from '../../../../constants/navigation/Routes';

/**
 * SnapshotDetailView displays detailed information about a specific snapshot.
 * Shows the snapshot tile.
 */
const SnapshotDetailView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route =
    useRoute<RouteProp<{ params: { snapshotId: string } }, 'params'>>();
  const { snapshotId } = route?.params ?? { snapshotId: '' };
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const hasRedirected = useRef(false);

  // Get snapshots using the hook
  const { snapshots, isLoading, hasError, fetchSnapshots } = useSnapshots();
  const snapshot = useMemo(
    (): SnapshotDto | undefined => snapshots?.find((s) => s.id === snapshotId),
    [snapshots, snapshotId],
  );

  // Redirect to rewards dashboard if snapshot not found after loading
  useEffect(() => {
    if (
      !isLoading &&
      !hasError &&
      !hasRedirected.current &&
      (!snapshotId || !snapshot)
    ) {
      hasRedirected.current = true;
      showToast(
        RewardsToastOptions.error(
          strings('rewards.snapshot_detail.toast_not_found_title'),
          strings('rewards.snapshot_detail.toast_not_found_description'),
        ),
      );
      navigation.navigate(Routes.REWARDS_DASHBOARD);
    }
  }, [
    isLoading,
    hasError,
    snapshotId,
    snapshot,
    navigation,
    showToast,
    RewardsToastOptions,
  ]);

  // Set navigation title with back button
  useEffect(() => {
    navigation.setOptions({
      ...getNavigationOptionsTitle(
        strings('rewards.snapshot_detail.title'),
        navigation,
        false,
        colors,
      ),
      headerTitleAlign: 'center',
    });
  }, [colors, navigation]);

  const renderSkeletonLoading = () => (
    <Box twClassName="h-40 bg-background-muted rounded-lg animate-pulse" />
  );

  const renderContent = () => {
    if (isLoading) {
      return renderSkeletonLoading();
    }

    if (hasError) {
      return (
        <RewardsErrorBanner
          title={strings('rewards.snapshot_detail.error_title')}
          description={strings('rewards.snapshot_detail.error_description')}
          onConfirm={fetchSnapshots}
          confirmButtonLabel={strings('rewards.snapshot_detail.retry')}
          testID="snapshot-detail-error-banner"
        />
      );
    }

    if (!snapshot) {
      return (
        <Box twClassName="items-center justify-center py-12">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.snapshot_detail.not_found')}
          </Text>
        </Box>
      );
    }

    return <SnapshotTile snapshot={snapshot} disableNavigation />;
  };

  return (
    <ErrorBoundary navigation={navigation} view="SnapshotDetailView">
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 py-4')}
        showsVerticalScrollIndicator={false}
        testID="snapshot-detail-view"
      >
        {/* Title */}
        <Box flexDirection={BoxFlexDirection.Column} twClassName="mb-4">
          <Text variant={TextVariant.HeadingLg} twClassName="text-default">
            {strings('rewards.snapshot_detail.heading')}
          </Text>
        </Box>

        {/* Snapshot Content */}
        {renderContent()}
      </ScrollView>
    </ErrorBoundary>
  );
};

export default SnapshotDetailView;
