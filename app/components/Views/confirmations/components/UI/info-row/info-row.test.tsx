import React from 'react';
import { render } from '@testing-library/react-native';

import InfoRow from './index';
import { InfoRowVariant } from './info-row';

describe('InfoRow', () => {
  it('renders', async () => {
    const { getByText } = render(
      <InfoRow label="label-Key">Value-Text</InfoRow>,
    );

    expect(getByText('label-Key')).toBeDefined();
    expect(getByText('Value-Text')).toBeDefined();
  });

  it('renders with small variant', () => {
    const { getByText } = render(
      <InfoRow label="label-Key" rowVariant={InfoRowVariant.Small}>
        Value-Text
      </InfoRow>,
    );

    expect(getByText('label-Key')).toBeDefined();
    expect(getByText('Value-Text')).toBeDefined();
  });
});
