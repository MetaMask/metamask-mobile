import React from 'react';
import GraphTooltip, { GraphTooltipProps } from '.';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

describe('GraphTooltip', () => {
  it('renders title and subtitle', () => {
    const props: GraphTooltipProps = {
      title: 'Sample Title',
      subtitle: 'Sample Subtitle',
      color: 'blue',
    };

    const { getByText } = renderWithProvider(<GraphTooltip {...props} />);

    expect(getByText(props.title)).toBeOnTheScreen();
    expect(getByText(props.subtitle)).toBeOnTheScreen();
  });
});
