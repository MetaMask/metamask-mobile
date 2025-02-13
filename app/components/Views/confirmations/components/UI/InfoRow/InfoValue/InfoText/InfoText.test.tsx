import React from 'react';
import { render } from '@testing-library/react-native';

import InfoText from './InfoText';

describe('InfoText', () => {
  it('applies correct styles', async () => {
    const { getByText } = render(<InfoText>Some Text</InfoText>);
    expect(getByText('Some Text').props.style).toEqual({
      color: '#141618',
      fontFamily: 'EuclidCircularB-Regular',
      fontSize: 14,
      fontWeight: '400',
    });
  });
});
