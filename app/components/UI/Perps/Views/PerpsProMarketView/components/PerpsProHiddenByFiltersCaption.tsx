import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

interface PerpsProHiddenByFiltersCaptionProps {
  /** Rows removed by the ticker and side filters on the active tab. */
  count: number;
  /** Pluralized i18n key (`one` / `other`) for the caption sentence. */
  messageKey: string;
}

/**
 * Single-line note under the Pro positions/orders filters when those filters
 * hide at least one row.
 */
const PerpsProHiddenByFiltersCaption = ({
  count,
  messageKey,
}: PerpsProHiddenByFiltersCaptionProps) => (
  <Box
    twClassName="px-4 pt-3"
    testID={PerpsProMarketViewSelectorsIDs.HIDDEN_BY_FILTERS_CAPTION}
  >
    <Text
      variant={TextVariant.BodyXs}
      color={TextColor.TextAlternative}
      numberOfLines={1}
    >
      {strings(messageKey, { count })}
    </Text>
  </Box>
);

export default PerpsProHiddenByFiltersCaption;
