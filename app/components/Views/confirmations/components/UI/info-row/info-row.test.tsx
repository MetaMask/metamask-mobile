import React from 'react';
import { render } from '@testing-library/react-native';

import InfoRow from './index';
import { InfoRowVariant } from './info-row';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';

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

  it('renders the copy icon in the provided color', () => {
    const { UNSAFE_getByProps } = render(
      <InfoRow
        label="Data"
        copyText="0xabc"
        copyIconColor={IconColor.Alternative}
      />,
    );

    expect(UNSAFE_getByProps({ name: IconName.Copy }).props.color).toBe(
      IconColor.Alternative,
    );
  });
});
