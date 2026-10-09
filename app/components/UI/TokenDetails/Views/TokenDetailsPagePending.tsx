import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { formatPriceWithSubscriptNotation } from '../../Predict/utils/format';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import TokenDetailsStickyFooter from '../components/TokenDetailsStickyFooter';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenPrice } from '../hooks/useTokenPrice';

export const TOKEN_DETAILS_PAGE_PENDING_TEST_ID = 'token-details-page-pending';

/**
 * Shown while `/v2/assets` is still deciding the new page versus the legacy
 * page. The header and Swap / Buy footer use the route token so a fast tap
 * does not wait on that request.
 */
const TokenDetailsPagePending = ({
  token,
}: {
  token: TokenDetailsRouteParams;
}) => {
  const navigation = useNavigation();
  const { currentPrice, currentCurrency, isLoading } = useTokenPrice({
    token,
  });
  const priceLabel =
    !isLoading && Number.isFinite(currentPrice) && currentPrice > 0
      ? formatPriceWithSubscriptNotation(currentPrice, currentCurrency ?? 'usd')
      : null;
  const priceDescription = priceLabel ? (
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      numberOfLines={1}
    >
      {priceLabel}
    </Text>
  ) : undefined;

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="flex-1"
      testID={TOKEN_DETAILS_PAGE_PENDING_TEST_ID}
    >
      <TokenDetailsInlineHeader
        token={token}
        securityData={null}
        onBackPress={() => navigation.goBack()}
        description={priceDescription}
      />
      <Box twClassName="flex-1 gap-4 px-4 pt-6">
        <Skeleton height={180} width="100%" twClassName="rounded-xl" />
        <Skeleton height={20} width="70%" twClassName="rounded-md" />
        <Skeleton height={20} width="45%" twClassName="rounded-md" />
      </Box>
      <TokenDetailsStickyFooter
        token={token}
        sourcePage="TokenDetailsView"
        swapTestID={TokenOverviewSelectorsIDs.SWAP_BUTTON}
        buyTestID={TokenOverviewSelectorsIDs.BUY_BUTTON}
      />
    </Box>
  );
};

export default TokenDetailsPagePending;
