import React from 'react';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
import {
  AssetInactiveBadge,
  AssetInactiveBadgeTestIds,
} from './AssetInactiveBadge';

describe('AssetInactiveBadge', () => {
  it('renders the inactive label with warning styling', () => {
    const { getByTestId, getByText } = render(<AssetInactiveBadge />);

    expect(getByText(strings('asset_activation.inactive'))).toBeTruthy();
    expect(getByTestId(AssetInactiveBadgeTestIds.BADGE)).toBeTruthy();
  });
});
