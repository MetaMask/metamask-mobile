import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from '@metamask/design-system-react-native';
import {DetailRow} from './';
import { DetailRowSelectorsIDs } from './testIds';

describe('DetailRow', () => {
  it('renders the label and children', () => {
    const { getByTestId } = render(
      <DetailRow label="Paying">
        <Text testID="detail-row-child">0.1 ETH</Text>
      </DetailRow>,
    );

    expect(getByTestId(DetailRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(DetailRowSelectorsIDs.LABEL)).toHaveTextContent('Paying');
    expect(getByTestId('detail-row-child')).toHaveTextContent('0.1 ETH');
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <DetailRow label="Paying" testID="custom-detail-row">
        <Text>0.1 ETH</Text>
      </DetailRow>,
    );

    expect(getByTestId('custom-detail-row')).toBeOnTheScreen();
    expect(queryByTestId(DetailRowSelectorsIDs.CONTAINER)).toBeNull();
  });
});
