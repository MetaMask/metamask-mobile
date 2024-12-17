// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Internal dependencies.
import WarningAlert from './WarningAlert';

describe('WarningAlert', () => {
  it('should render correctly', () => {
    const mockDismissFunction = jest.fn();
    render(<WarningAlert text={'test'} dismissAlert={mockDismissFunction} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
