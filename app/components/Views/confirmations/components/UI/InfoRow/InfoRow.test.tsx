import React from 'react';
import { render } from '@testing-library/react-native';

import InfoRow from './index';

describe('InfoRow', () => {
  it('should render correctly', async () => {
    const { getByText } = render(
      <InfoRow label="label-Key">Value-Text</InfoRow>,
    );
    expect(getByText('label-Key')).toBeDefined();
    expect(getByText('Value-Text')).toBeDefined();
  });
});
