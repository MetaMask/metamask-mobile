import React from 'react';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
import { AssetInactiveBadge } from './AssetInactiveBadge';

describe('AssetInactiveBadge', () => {
  it('renders the inactive label', () => {
    const { getByText } = render(<AssetInactiveBadge />);

    expect(getByText(strings('asset_activation.inactive'))).toBeTruthy();
  });
});
