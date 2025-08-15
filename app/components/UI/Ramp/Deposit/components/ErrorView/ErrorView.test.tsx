import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import ErrorView from './ErrorView';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'ErrorView',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('ErrorView Component', () => {
  const mockCtaOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => <ErrorView />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with all props and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <ErrorView
        title="Custom Error Title"
        description="Custom error description"
        ctaLabel="custom cta label"
        ctaOnPress={mockCtaOnPress}
      />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls ctaOnPress when button is pressed', () => {
    const { getByText } = renderWithProvider(() => (
      <ErrorView description="Test error" ctaOnPress={mockCtaOnPress} />
    ));

    const button = getByText('Try again');
    fireEvent.press(button);

    expect(mockCtaOnPress).toHaveBeenCalledTimes(1);
  });
});
