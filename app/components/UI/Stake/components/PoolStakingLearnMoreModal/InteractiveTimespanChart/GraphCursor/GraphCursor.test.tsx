import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import GraphCursor, { GraphCursorProps } from '.';
import { lightTheme } from '@metamask/design-tokens';

describe('GraphCursor', () => {
  const MOCK_DATA = [
    2.6293099000355724, 2.8917589155691483, 2.7419089818104134,
    3.539389365276984, 2.4752501611359663, 2.7702575807540017,
    2.646738155404836,
  ];
  const MOCK_CURRENT_X = 2;
  const MOCK_X = () => 73;
  const MOCK_Y = () => 33.17441726994484;
  const MOCK_COLOR = lightTheme.colors.success.default;

  it('render matches snapshot', () => {
    const props: GraphCursorProps = {
      data: MOCK_DATA,
      currentX: MOCK_CURRENT_X,
      x: MOCK_X,
      y: MOCK_Y,
      color: MOCK_COLOR,
    };

    const { toJSON } = renderWithProvider(<GraphCursor {...props} />);

    expect(toJSON()).toMatchSnapshot();
  });
});
