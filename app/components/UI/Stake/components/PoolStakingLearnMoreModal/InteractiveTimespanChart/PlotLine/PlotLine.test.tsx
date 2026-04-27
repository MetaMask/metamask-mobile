import React from 'react';
import PlotLine from '.';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

const MOCK_LINE =
  'M0,38.513284280113034L73,33.17441726994484L146,36.22273835506641L219,20L292,41.6472432928151L365,35.64605720662807L438,38.158750133941524';

describe('PlotLine', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <PlotLine line={MOCK_LINE} color={'blue'} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
