import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { FeedSubHeader } from '../types';

export interface FeedSubHeaderTextProps {
  subHeader: FeedSubHeader;
}

/**
 * Renders the feed position-card sub-header with Figma typography: dollar
 * amounts in TextDefault, " at " / " MC" connectors in TextAlternative.
 */
const FeedSubHeaderText: React.FC<FeedSubHeaderTextProps> = ({ subHeader }) => {
  if (!subHeader.sizeLabel) {
    return null;
  }

  const atConnector = strings(
    'social_leaderboard.feed.sub_header.at_connector',
  );
  const marketCapSuffix = strings(
    'social_leaderboard.feed.sub_header.market_cap_suffix',
  );

  return (
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      numberOfLines={1}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {subHeader.sizeLabel}
      </Text>
      {subHeader.contextValueLabel ? (
        <>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {` ${atConnector} `}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {subHeader.contextValueLabel}
          </Text>
          {subHeader.contextKind === 'marketCap' ? (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {` ${marketCapSuffix}`}
            </Text>
          ) : null}
        </>
      ) : null}
    </Text>
  );
};

export default FeedSubHeaderText;
