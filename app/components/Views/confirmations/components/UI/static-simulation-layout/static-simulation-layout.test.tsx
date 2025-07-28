import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import AnimatedSpinner from '../../../../../UI/AnimatedSpinner';
import { StaticSimulationLayout } from './static-simulation-layout';

jest.mock('../../../../../UI/AnimatedSpinner');

describe('StaticSimulationLayout', () => {
  const AnimatedSpinnerMock = jest.mocked(AnimatedSpinner);
  const defaultProps = {
    children: <Text>Test Children</Text>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByText } = render(<StaticSimulationLayout {...defaultProps} />);

    expect(getByText('Test Children')).toBeDefined();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = render(
      <StaticSimulationLayout {...defaultProps} testID="custom-test-id" />,
    );

    expect(getByTestId('custom-test-id')).toBeDefined();
  });

  it('shows spinner when isLoading is true', () => {
    render(<StaticSimulationLayout {...defaultProps} isLoading />);

    expect(AnimatedSpinnerMock).toHaveBeenCalled();
  });

  it('does not show children when isLoading is true', () => {
    const { queryByText } = render(
      <StaticSimulationLayout {...defaultProps} isLoading />,
    );

    expect(queryByText('Test Children')).toBeNull();
  });

  it('shows children when isLoading is false', () => {
    const { getByText } = render(
      <StaticSimulationLayout {...defaultProps} isLoading={false} />,
    );

    expect(getByText('Test Children')).toBeDefined();
  });

  it('shows children when isLoading is not provided (defaults to false)', () => {
    const { getByText } = render(<StaticSimulationLayout {...defaultProps} />);

    expect(getByText('Test Children')).toBeDefined();
  });

  it('does not show spinner when isLoading is false', () => {
    const { queryByTestId } = render(
      <StaticSimulationLayout {...defaultProps} isLoading={false} />,
    );

    expect(queryByTestId('simulation-details-spinner')).toBeNull();
  });

  it('does not show spinner when isLoading is not provided (defaults to false)', () => {
    const { queryByTestId } = render(
      <StaticSimulationLayout {...defaultProps} />,
    );

    expect(queryByTestId('simulation-details-spinner')).toBeNull();
  });
});
