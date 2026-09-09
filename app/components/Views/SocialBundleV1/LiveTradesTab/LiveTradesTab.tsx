import React from 'react';
import EmptyPlaceholder from '../shared/EmptyPlaceholder';

/**
 * Placeholder for the Live trades tab in the SocialBundleV1 prototype.
 * Real content ships in a follow-up PR (TSA-1121 is Feed-only).
 */
const LiveTradesTab: React.FC = () => (
  <EmptyPlaceholder
    label="Live trades"
    hint="Coming soon — prototype ships the Feed tab first."
  />
);

export default LiveTradesTab;
