// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import CellDisplay from './CellDisplay';
import {
  CELLDISPLAY_TEST_ID,
  SAMPLE_CELLDISPLAY_PROPS,
} from './CellDisplay.constants';

describe('CellDisplay', () => {
  it('should render default settings correctly', () => {
    const wrapper = render(<CellDisplay {...SAMPLE_CELLDISPLAY_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellDisplay', () => {
    const { queryByTestId } = render(
      <CellDisplay {...SAMPLE_CELLDISPLAY_PROPS} />,
    );
    expect(queryByTestId(CELLDISPLAY_TEST_ID)).not.toBe(null);
  });
});
