import React from 'react';
import { render } from '@testing-library/react-native';

import InfoRow, { InfoRowSkeleton, InfoRowVariant } from './info-row';

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

  it('renders a tooltip next to the label', () => {
    const { getByTestId } = render(
      <InfoRow label="label-Key" tooltip="Tooltip content">
        Value-Text
      </InfoRow>,
    );

    expect(getByTestId('info-row-tooltip-open-btn')).toBeOnTheScreen();
  });
});

describe('InfoRowSkeleton', () => {
  it('forwards testId to the key value row skeleton', () => {
    const { getByTestId } = render(
      <InfoRowSkeleton testId="info-row-skeleton" />,
    );

    expect(getByTestId('info-row-skeleton')).toBeOnTheScreen();
  });
});
