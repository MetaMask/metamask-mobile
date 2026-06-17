///: BEGIN:ONLY_INCLUDE_IF(stellar)
import React from 'react';
import { render } from '@testing-library/react-native';
import { StellarTrustlineInactiveBadge } from './StellarTrustlineInactiveBadge';
import { strings } from '../../../../locales/i18n';

describe('StellarTrustlineInactiveBadge', () => {
  it('renders inactive label', () => {
    const { getByText } = render(<StellarTrustlineInactiveBadge />);
    expect(getByText(strings('stellarTrustlineInactive'))).toBeTruthy();
  });
});
///: END:ONLY_INCLUDE_IF
