import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import DataGradient, { DataGradientProps } from '.';

const MOCK_DATA_POINTS = [
  2.6293099000355724, 2.8917589155691483, 2.7419089818104134, 3.539389365276984,
  2.4752501611359663, 2.7702575807540017, 2.646738155404836,
];

describe('DataGradient', () => {
  it('render matches snapshot', () => {
    const props: DataGradientProps = {
      dataPoints: MOCK_DATA_POINTS,
    };

    const { toJSON } = renderWithProvider(<DataGradient {...props} />);

    expect(toJSON()).toMatchSnapshot();
  });
});
