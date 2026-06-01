import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../../component-library/components-temp/SectionHeader';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../../Wallet/WalletView.testIds';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictPosition } from '../../../../../UI/Predict/types';
import { PredictClaimButton } from '../../../../../UI/Predict/components/PredictActionButtons';
import HomepageSectionUnrealizedPnlRow from '../../../components/HomepageSectionUnrealizedPnlRow';
import type { PredictHomepageUnrealizedPnlRowState } from '../predictionsSectionTypes';
import {
  PredictPositionRow,
  PredictPositionRowSkeleton,
} from './PredictPositionRow';

export interface HomepagePredictPositionsProps {
  title: string;
  onViewAll: () => void;
  privacyMode: boolean;
  isLoadingPositions: boolean;
  positions: PredictPosition[];
  isLoadingClaimable: boolean;
  totalClaimableValue: number;
  predictHomepageUnrealizedPnl: PredictHomepageUnrealizedPnlRowState;
  onClaim: () => Promise<void>;
  onPositionPress: (position: PredictPosition) => void;
  /** When false the section header is omitted (e.g. carousel shown above positions). */
  showHeader?: boolean;
}

const HomepagePredictPositions = ({
  title,
  onViewAll,
  privacyMode,
  isLoadingPositions,
  positions,
  isLoadingClaimable,
  totalClaimableValue,
  predictHomepageUnrealizedPnl,
  onClaim,
  onPositionPress,
  showHeader = true,
}: HomepagePredictPositionsProps) => (
  <Box gap={3}>
    {showHeader && (
      <Box gap={1}>
        <SectionHeader
          title={title}
          onPress={onViewAll}
          testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('predictions')}
        />
        {predictHomepageUnrealizedPnl.show && (
          <HomepageSectionUnrealizedPnlRow
            isLoading={predictHomepageUnrealizedPnl.isLoading}
            valueText={predictHomepageUnrealizedPnl.valueText}
            tone={predictHomepageUnrealizedPnl.tone}
            label={strings('predict.unrealized_pnl_label')}
            testID="homepage-predict-unrealized-pnl"
          />
        )}
      </Box>
    )}
    {isLoadingPositions ? (
      <>
        <PredictPositionRowSkeleton />
        <PredictPositionRowSkeleton />
      </>
    ) : (
      positions.map((position) => (
        <PredictPositionRow
          key={`${position.outcomeId}:${position.outcomeIndex}`}
          position={position}
          onPress={onPositionPress}
          privacyMode={Boolean(privacyMode)}
        />
      ))
    )}
    {!isLoadingPositions && !isLoadingClaimable && totalClaimableValue > 0 && (
      <Box paddingHorizontal={4} paddingTop={1} paddingBottom={3}>
        <PredictClaimButton
          amount={privacyMode ? undefined : totalClaimableValue}
          onPress={onClaim}
        />
      </Box>
    )}
  </Box>
);

export default HomepagePredictPositions;
