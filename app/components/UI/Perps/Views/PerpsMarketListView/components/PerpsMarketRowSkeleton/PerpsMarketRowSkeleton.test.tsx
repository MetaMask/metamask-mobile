import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsMarketRowSkeleton from './PerpsMarketRowSkeleton';

jest.mock('../../../../../../../component-library/components/Skeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: ({
      testID,
      ...props
    }: {
      testID?: string;
      width?: number;
      height?: number;
      style?: object;
    }) => <View testID={testID} {...props} />,
  };
});

describe('PerpsMarketRowSkeleton', () => {
  it('renders without crashing with testID', () => {
    const { getByTestId } = render(
      <PerpsMarketRowSkeleton testID="market-skeleton" />,
    );

    expect(getByTestId('market-skeleton')).toBeTruthy();
  });

  it('renders without crashing without testID', () => {
    const { toJSON } = render(<PerpsMarketRowSkeleton />);

    expect(toJSON()).toBeTruthy();
  });
});
