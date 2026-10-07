import React from 'react';
import { render } from '@testing-library/react-native';

import { strings } from '../../../../../../locales/i18n';
import { getResultTypeConfig } from '../../utils/securityUtils';
import SecurityTrustInlineBadge from './SecurityTrustInlineBadge';

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
});
