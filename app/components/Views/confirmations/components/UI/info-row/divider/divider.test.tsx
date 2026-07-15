import React from 'react';
import { InfoRowDivider } from './divider';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../../../../util/theme';
describe('InfoRowDivider', () => {
  it('should use correct styles from useStyles hook', () => {
    const wrapper = renderWithProvider(<InfoRowDivider />);

    expect(wrapper.root.props.style).toEqual({
      height: 1,
      backgroundColor: mockTheme.colors.border.muted,
      marginHorizontal: -8,
    });
  });
});
