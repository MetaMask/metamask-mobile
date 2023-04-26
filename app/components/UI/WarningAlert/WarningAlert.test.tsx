// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import WarningAlert from './WarningAlert';

describe('ButtonBase', () => {
  it('should render correctly', () => {
    const mockDismissFunction = jest.fn();
    const { toJSON } = render(
      <WarningAlert text={'test'} dismissAlert={mockDismissFunction} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
