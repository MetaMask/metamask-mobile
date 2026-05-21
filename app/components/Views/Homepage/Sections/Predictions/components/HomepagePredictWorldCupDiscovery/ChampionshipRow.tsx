import React from 'react';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../../../component-library/components-temp/Skeleton';
import { strings } from '../../../../../../../../locales/i18n';
import PredictMarketRowItem from '../../../../../../UI/Predict/components/PredictMarketRowItem';
import { PredictEventValues } from '../../../../../../UI/Predict/constants/eventNames';
import type { PredictMarket } from '../../../../../../UI/Predict/types';
import type { TransactionActiveAbTestEntry } from '../../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import HomepagePredictDiscoveryMaterialGlyph from './HomepagePredictDiscoveryMaterialGlyph';

/** One-row placeholder aligned with `PredictMarketRowItem` loading height. */
const ChampionshipRowSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="items-start py-2 gap-4 w-full"
      testID="homepage-predict-discovery-championship-row-skeleton"
    >
      <Box twClassName="pt-1">
        <Skeleton width={40} height={40} style={tw.style('rounded-full')} />
      </Box>
      <Box twClassName="flex-1 gap-1">
        <Skeleton width="80%" height={20} style={tw.style('rounded-md')} />
        <Skeleton width="60%" height={16} style={tw.style('rounded-md')} />
      </Box>
      <Box twClassName="gap-1 items-end">
        <Skeleton width={70} height={20} style={tw.style('rounded-md')} />
        <Skeleton width={50} height={16} style={tw.style('rounded-md')} />
      </Box>
    </Box>
  );
};

export type ChampionshipRowState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | {
      kind: 'market';
      market: PredictMarket;
      detailsTitle: string | undefined;
    };

interface ChampionshipRowProps {
  state: ChampionshipRowState;
  onPress?: () => void;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const ChampionshipRow = ({
  state,
  onPress,
  transactionActiveAbTests,
}: ChampionshipRowProps) => {
  if (state.kind === 'loading') {
    return <ChampionshipRowSkeleton />;
  }
  if (state.kind === 'empty') {
    return (
      <Box twClassName="py-4">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('predict.homepage_discovery.championship_unavailable')}
        </Text>
      </Box>
    );
  }
  return (
    <PredictMarketRowItem
      market={state.market}
      entryPoint={PredictEventValues.ENTRY_POINT.HOME_SECTION}
      showChevron
      leadingAccessory={
        <HomepagePredictDiscoveryMaterialGlyph name="emojiEvents" />
      }
      detailsTitle={state.detailsTitle}
      onPress={onPress}
      transactionActiveAbTests={transactionActiveAbTests}
      testID="homepage-predict-discovery-championship-row"
    />
  );
};

export default ChampionshipRow;
