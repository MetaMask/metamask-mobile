// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

//External dependencies
import { CellModalSelectorsIDs } from '../../../../../../../e2e/selectors/Modals/CellModal.selectors';

// Internal dependencies.
import CellDisplay from './CellDisplay';
import { SAMPLE_CELLDISPLAY_PROPS } from './CellDisplay.constants';

describe('CellDisplay', () => {
  it('should render default settings correctly', () => {
    const wrapper = render(<CellDisplay {...SAMPLE_CELLDISPLAY_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellDisplay', () => {
    const { queryByTestId } = render(
      <CellDisplay {...SAMPLE_CELLDISPLAY_PROPS} />,
    );
    expect(queryByTestId(CellModalSelectorsIDs.DISPLAY)).not.toBe(null);
  });
});
