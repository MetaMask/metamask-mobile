import React from 'react';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { SecurityTabSelectors } from '../SecurityTab.testIds';

export interface SecurityScanMetaProps {
  /**
   * Age of the Blockaid scan.
   *
   * `null` drops the freshness clause and shows the attribution alone, rather
   * than guessing at a time. The live payload carries no scan timestamp today,
   * so `null` is the expected production value until it does.
   */
  checkedMinutesAgo: number | null;
}

/**
 * Provenance line sitting directly under the contract checks.
 *
 * Attached to the checks rather than to the bottom of the tab because it is
 * those four rows it describes: they come from a third-party scan, and naming
 * the provider plus the scan's age is what lets the reader judge how much to
 * trust a tick that may be hours old.
 */
export const SecurityScanMeta: React.FC<SecurityScanMetaProps> = ({
  checkedMinutesAgo,
}) => (
  <Text
    variant={TextVariant.BodyXs}
    color={TextColor.TextAlternative}
    twClassName="pt-2"
    testID={SecurityTabSelectors.SCAN_META}
  >
    {checkedMinutesAgo === null
      ? strings('token_details_v1.security_tab.checks_meta.attribution')
      : strings(
          'token_details_v1.security_tab.checks_meta.attribution_checked',
          { count: checkedMinutesAgo },
        )}
  </Text>
);

export default SecurityScanMeta;
