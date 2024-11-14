import React from 'react';
import { render } from '@testing-library/react-native';

import InfoRow from './index';

describe('InfoRow', () => {
  it('should match snapshot for simple text value', async () => {
    const container = render(<InfoRow label="label-Key">Value-Text</InfoRow>);
    expect(container).toMatchSnapshot();
  });
});
