import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { DefaultDetails } from './DefaultDetails';
import { SendDetails } from './SendDetails';

/**
 * Dispatches an {@link ActivityListItem} to its per-type details template,
 * mirroring the extension's `template-loader`. Foundation pass: only
 * `send`/`receive` have a dedicated template; everything else renders the
 * generic `DefaultDetails`. Per-type templates (swap/bridge/perps/predictions)
 * are added in later passes.
 */
export function TemplateLoader({
  item,
}: {
  item: ActivityListItem | undefined;
}) {
  if (!item) {
    return null;
  }

  switch (item.type) {
    case 'send':
    case 'receive':
      return <SendDetails item={item} />;
    default:
      return <DefaultDetails item={item} />;
  }
}
