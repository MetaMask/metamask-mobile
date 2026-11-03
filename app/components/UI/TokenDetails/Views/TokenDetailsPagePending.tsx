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
import { formatPriceWithSubscriptNotation } from '../../../../util/number/subscriptNotation';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenPrice } from '../hooks/useTokenPrice';

export const TOKEN_DETAILS_PAGE_PENDING_TEST_ID = 'token-details-page-pending';

/**
 * Shown while `/v2/assets` is still deciding the new page versus the legacy
 * page. The header uses the route token so it is visible immediately. The
 * sticky footer is intentionally omitted here: the final page holds its footer
 * back until the trader position settles, so showing one now would make it
 * appear, disappear on the page swap, then reappear.
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
    </Box>
  );
};

export default TokenDetailsPagePending;
