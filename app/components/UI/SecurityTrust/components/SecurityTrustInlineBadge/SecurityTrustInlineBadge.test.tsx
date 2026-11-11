import {
  IconAlertSeverity,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import React from 'react';
import { render } from '@testing-library/react-native';

import { strings } from '../../../../../../locales/i18n';
import { getResultTypeConfig } from '../../utils/securityUtils';
import SecurityTrustInlineBadge, {
  type SecurityTrustInlineBadgeConfig,
} from './SecurityTrustInlineBadge';

describe('SecurityTrustInlineBadge', () => {
  it('renders the Risky label in a warning tag', () => {
    const badge = getResultTypeConfig('Warning').badge;

    const { getByText } = render(
      badge ? <SecurityTrustInlineBadge badge={badge} /> : <></>,
    );

    expect(getByText(strings('security_trust.risky'))).toBeOnTheScreen();
  });

  it('renders the Malicious label in a danger tag', () => {
    const badge = getResultTypeConfig('Malicious').badge;

    const { getByText } = render(
      badge ? <SecurityTrustInlineBadge badge={badge} /> : <></>,
    );

    expect(getByText(strings('security_trust.malicious'))).toBeOnTheScreen();
  });

  it('renders an icon-only badge for Verified tokens', () => {
    const badge = getResultTypeConfig('Verified').badge;

    const { getByTestId, queryByText } = render(
      badge ? (
        <SecurityTrustInlineBadge badge={badge} iconTestID="verified-icon" />
      ) : (
        <></>
      ),
    );

    expect(getByTestId('verified-icon')).toBeOnTheScreen();
    expect(queryByText(strings('security_trust.verified'))).toBeNull();
  });

  it('renders an alert icon for an icon-only badge with a severity', () => {
    const verified = getResultTypeConfig('Verified').badge;
    const badge: SecurityTrustInlineBadgeConfig = {
      ...(verified as SecurityTrustInlineBadgeConfig),
      label: null,
      iconAlertSeverity: IconAlertSeverity.Success,
    };

    const { getByTestId } = render(
      <SecurityTrustInlineBadge badge={badge} iconTestID="success-icon" />,
    );

    expect(getByTestId('success-icon')).toBeOnTheScreen();
  });

  it.each([
    [IconAlertSeverity.Info, 'Info'],
    [IconAlertSeverity.Success, 'Success'],
  ])('maps %s alert severity onto a labelled tag', (severity, label) => {
    const badge: SecurityTrustInlineBadgeConfig = {
      icon: IconName.Info,
      iconColor: IconColor.IconDefault,
      iconAlertSeverity: severity,
      label,
      bg: null,
    };

    const { getByText } = render(<SecurityTrustInlineBadge badge={badge} />);

    expect(getByText(label)).toBeOnTheScreen();
  });

  it('renders a neutral tag when a labelled badge has no alert severity', () => {
    const badge: SecurityTrustInlineBadgeConfig = {
      icon: IconName.Info,
      iconColor: IconColor.IconDefault,
      label: 'Info only',
      bg: null,
    };

    const { getByText } = render(<SecurityTrustInlineBadge badge={badge} />);

    expect(getByText('Info only')).toBeOnTheScreen();
  });
});
