import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { TokenSecurityFinancialStats } from '@metamask/assets-controllers';
import { strings } from '../../../../../../locales/i18n';
import useBlockExplorer from '../../../../hooks/useBlockExplorer';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import type { AnalyticsTrackingEvent } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { trackBlockExplorerLinkClicked } from '../../../../../util/analytics/externalLinkTracking';
import { formatAddress } from '../../../../../util/address';
import {
  SocialEvent,
  useSocialScreenAnalytics,
} from '../../../../Views/SocialLeaderboard/analytics';
import { SECURITY_STAT_LABEL_KEYS } from '../V1/SecurityTab/SecurityTab.constants';
import { STAT_EMPTY_VALUE, TokenStatKey } from '../../constants/tokenStats';
import { TokenDetailsIds } from '../../testIds';
import { getTopTenWalletHolders } from '../../utils/securityFacts';
import { formatPercent } from '../../utils/statBarFormat';

interface TokenSecurityHoldersTabProps {
  chainId?: string;
  holders: NonNullable<TokenSecurityFinancialStats['topHolders']>;
  holdersCount?: string | null;
  topTen?: string | null;
}

const TokenSecurityHoldersTab: React.FC<TokenSecurityHoldersTabProps> = ({
  chainId,
  holders,
  holdersCount,
  topTen,
}) => {
  const { getBlockExplorerUrl, toBlockExplorer } = useBlockExplorer(chainId);
  const analytics = useAnalytics();
  useSocialScreenAnalytics(SocialEvent.Screen.TOKEN_DETAILS_HOLDERS, {
    source: SocialEvent.Source.TOKEN_DETAILS_HOLDERS,
  });
  const holderLabel = strings(SECURITY_STAT_LABEL_KEYS[TokenStatKey.Holders]);
  const topTenLabel = strings(SECURITY_STAT_LABEL_KEYS[TokenStatKey.Top10]);

  return (
    <Box twClassName="px-4 py-4">
      <Box twClassName="flex-row gap-6 border-b border-border-muted pb-4">
        <Box>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {holderLabel}
          </Text>
          <Text
            variant={TextVariant.HeadingMd}
            testID={TokenDetailsIds.securityHolders.count}
          >
            {holdersCount ?? STAT_EMPTY_VALUE}
          </Text>
        </Box>
        <Box>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {topTenLabel}
          </Text>
          <Text
            variant={TextVariant.HeadingMd}
            testID={TokenDetailsIds.securityHolders.topTen}
          >
            {topTen ?? STAT_EMPTY_VALUE}
          </Text>
        </Box>
      </Box>
      {getTopTenWalletHolders(holders).map(
        ({ address, name, holdingPercentage }, index) => {
          const rank = index + 1;
          const shortAddress = formatAddress(address, 'short');
          const title = name ?? shortAddress;
          const share = formatPercent(holdingPercentage, 2) ?? STAT_EMPTY_VALUE;
          const explorerUrl = chainId ? getBlockExplorerUrl(address) : null;

          return (
            <Pressable
              key={address}
              accessibilityRole={explorerUrl ? 'link' : undefined}
              disabled={!explorerUrl}
              testID={TokenDetailsIds.securityHolders.row}
              onPress={(): void => {
                if (!explorerUrl) return;
                trackBlockExplorerLinkClicked<AnalyticsTrackingEvent>(
                  (event) => analytics.trackEvent(event),
                  (event) => analytics.createEventBuilder(event),
                  {
                    location: SocialEvent.Source.TOKEN_DETAILS_HOLDERS,
                    text: holderLabel,
                    url: explorerUrl,
                  },
                );
                toBlockExplorer(address);
              }}
            >
              <Box twClassName="flex-row items-center gap-3 border-b border-border-muted py-3">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {rank}
                </Text>
                <Box twClassName="flex-1">
                  <Text variant={TextVariant.BodyMd} numberOfLines={1}>
                    {title}
                  </Text>
                  {name ? (
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {shortAddress}
                    </Text>
                  ) : null}
                </Box>
                <Text variant={TextVariant.BodyMd}>{share}</Text>
              </Box>
            </Pressable>
          );
        },
      )}
    </Box>
  );
};

export default TokenSecurityHoldersTab;
