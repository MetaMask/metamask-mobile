import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  HeaderBase,
  Skeleton,
} from '@metamask/design-system-react-native';

export const CashTokensFullViewSkeletonTestIds = {
  CONTAINER: 'cash-tokens-full-view-skeleton',
};

/**
 * First-paint loading skeleton for the Money Hub (CashTokensFullView).
 *
 * Mirrors the Hub's section layout (header / hero / bonus card /
 * convert-stablecoins card / bottom CTA) so the initial render no longer
 * flashes the generic TokenList skeleton before the real Hub renders.
 */
const CashTokensFullViewSkeleton = () => {
  const tw = useTailwind();

  return (
    <SafeAreaView
      style={tw`flex-1 bg-default pb-4`}
      testID={CashTokensFullViewSkeletonTestIds.CONTAINER}
    >
      <HeaderBase style={tw`p-4`} twClassName="h-auto">
        <Skeleton height={20} width={120} />
      </HeaderBase>

      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        <Box twClassName="px-4 mt-2">
          <Skeleton height={140} width="100%" />
        </Box>

        <Box twClassName="px-4 mt-4">
          <Skeleton height={96} width="100%" />
        </Box>

        <Box twClassName="px-4 mt-4">
          <Skeleton height={28} width="60%" />
          <Box twClassName="mt-3">
            <Skeleton height={16} width="90%" />
          </Box>
          <Box twClassName="mt-2">
            <Skeleton height={16} width="80%" />
          </Box>
          <Box flexDirection={BoxFlexDirection.Row} twClassName="mt-3 gap-2">
            <Skeleton height={24} width={88} />
            <Skeleton height={24} width={88} />
          </Box>
          <Box twClassName="mt-4">
            <Skeleton height={48} width="100%" />
          </Box>
        </Box>
      </ScrollView>

      <Box twClassName="px-4 pt-4">
        <Skeleton height={48} width="100%" />
      </Box>
    </SafeAreaView>
  );
};

CashTokensFullViewSkeleton.displayName = 'CashTokensFullViewSkeleton';

export default CashTokensFullViewSkeleton;
