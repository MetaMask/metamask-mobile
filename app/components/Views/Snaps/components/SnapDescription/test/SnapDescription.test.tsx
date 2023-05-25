import React from 'react';
import { render } from '@testing-library/react-native';
import SnapDescription from '../SnapDescription';
import {
  SNAP_DESCRIPTION_TITLE,
  SNAP_DESCRIPTION,
} from '../../../../../../constants/test-ids';

describe('SnapDescription', () => {
  it('renders correctly', async () => {
    const { getByTestId } = render(
      <SnapDescription
        snapName="test snap"
        snapDescription="Test snap description"
      />,
    );
    const title = await getByTestId(SNAP_DESCRIPTION_TITLE);
    const description = await getByTestId(SNAP_DESCRIPTION);
    expect(title.props.children).toBe('test snap');
    expect(description.props.children).toBe('Test snap description');
  });
});
