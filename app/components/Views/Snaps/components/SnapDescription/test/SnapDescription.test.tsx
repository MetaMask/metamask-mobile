import React from 'react';
import { render } from '@testing-library/react-native';
import SnapDescription from '../SnapDescription';
import { SNAP_DESCRIPTION } from '../SnapDescription.constants';

describe('SnapDescription', () => {
  it('renders correctly', async () => {
    const { getByTestId } = render(
      <SnapDescription snapDescription="Test snap description" />,
    );
    const description = await getByTestId(SNAP_DESCRIPTION);
    expect(description.props.children).toBe('Test snap description');
  });
});
