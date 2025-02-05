import React from 'react';
import { InfoRowDivider } from './Divider';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

describe('InfoRowDivider', () => {
  it('should use correct styles from useStyles hook', () => {
    const wrapper = renderWithProvider(<InfoRowDivider />);

    expect(wrapper.root.props.style).toEqual({
      height: 1,
      backgroundColor: '#BBC0C566',
      marginHorizontal: -8,
    });
  });
});
