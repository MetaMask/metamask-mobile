import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  Skeleton,
} from '@metamask/design-system-react-native';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { TokenDetailsIds } from '../testIds';

/**
 * Shown while `/v2/assets` is still deciding the new page versus the legacy
 * page. The header uses the route token so it is visible immediately.
 *
 * The subtitle intentionally hides the contract address and omits the live
 * price: we do not yet know whether the token resolves to the memecoin TDP
 * (which hides the address) or the legacy TDP (which shows it). Displaying
 * either one here would cause a visible flicker on the transition.
 */
const TokenDetailsPagePending = ({
  token,
}: {
  token: TokenDetailsRouteParams;
}) => {
  const navigation = useNavigation();

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="flex-1"
      testID={TokenDetailsIds.pending}
    >
      <TokenDetailsInlineHeader
        token={token}
        securityData={null}
        onBackPress={() => navigation.goBack()}
        hideContractAddress
      />
      <Box twClassName="flex-1 gap-4 px-4 pt-6">
        <Skeleton height={180} width="100%" twClassName="rounded-xl" />
        <Skeleton height={20} width="70%" twClassName="rounded-md" />
        <Skeleton height={20} width="45%" twClassName="rounded-md" />
      </Box>
    </Box>
  );
};

export default TokenDetailsPagePending;
