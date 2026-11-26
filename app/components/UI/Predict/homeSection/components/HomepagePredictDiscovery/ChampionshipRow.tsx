import React from 'react';
import {
  Box,
  BoxFlexDirection,
  type IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { strings } from '../../../../../../../locales/i18n';
import PredictMarketRowItem from '../../../components/PredictMarketRowItem';
import { PredictEventValues } from '../../../constants/eventNames';
import type { PredictMarket } from '../../../types';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import HomepagePredictDiscoveryRowIcon from './HomepagePredictDiscoveryRowIcon';

/** One-row placeholder aligned with `PredictMarketRowItem` loading height. */
const ChampionshipRowSkeleton: React.FC<{ testID?: string }> = ({ testID }) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      className="items-start py-2 gap-4 w-full"
      testID={testID ?? 'homepage-predict-discovery-championship-row-skeleton'}
    >
      <Box className="pt-1">
        <Skeleton width={40} height={40} style={tw.style('rounded-full')} />
      </Box>
      <Box className="flex-1 gap-1">
        <Skeleton width="80%" height={20} style={tw.style('rounded-md')} />
        <Skeleton width="60%" height={16} style={tw.style('rounded-md')} />
      </Box>
      <Box className="gap-1 items-end">
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
  iconName?: IconName;
  onPress?: () => void;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  testID?: string;
}

const ChampionshipRow = ({
  state,
  iconName,
  onPress,
  transactionActiveAbTests,
  testID,
}: ChampionshipRowProps) => {
  if (state.kind === 'loading') {
    return <ChampionshipRowSkeleton testID={testID} />;
  }
  if (state.kind === 'empty') {
    return (
      <Box className="py-4" testID={testID}>
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
        <HomepagePredictDiscoveryRowIcon
          iconName={iconName}
          fallbackGlyph="emojiEvents"
        />
      }
      detailsTitle={state.detailsTitle}
      onPress={onPress}
      transactionActiveAbTests={transactionActiveAbTests}
      testID={testID ?? 'homepage-predict-discovery-championship-row'}
    />
  );
};

export default ChampionshipRow;
