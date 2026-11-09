import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import SocialEmptyState from '../../../shared/SocialEmptyState';
import type { SocialV1FeedTab } from '../types';
import { SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID } from './SocialV1FeedEmptyState.testIds';

type SocialV1EmptyStateTab = SocialV1FeedTab | 'live';

export interface SocialV1FeedEmptyStateProps {
  /** Which Social V1 tab has no content. */
  tab: SocialV1EmptyStateTab;
}

/**
 * Empty state for a Social V1 tab whose feed loaded with no content.
 */
const SocialV1FeedEmptyState: React.FC<SocialV1FeedEmptyStateProps> = ({
  tab,
}) => (
  <SocialEmptyState
    description={strings(`social_leaderboard.feed.v1_empty.${tab}.description`)}
    testID={SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID}
  />
);

export default SocialV1FeedEmptyState;
