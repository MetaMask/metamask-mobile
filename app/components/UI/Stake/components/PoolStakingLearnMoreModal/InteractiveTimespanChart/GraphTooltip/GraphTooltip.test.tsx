import React from 'react';
import GraphTooltip, { GraphTooltipProps } from '.';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

describe('GraphTooltip', () => {
  it('render matches snapshot', () => {
    const props: GraphTooltipProps = {
      title: 'Sample Title',
      subtitle: 'Sample Subtitle',
      color: 'blue',
    };

    const component = renderWithProvider(<GraphTooltip {...props} />);

    expect(component).toMatchSnapshot();
  });
});
