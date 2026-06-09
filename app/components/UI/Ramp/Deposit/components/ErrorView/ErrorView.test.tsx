import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import ErrorView from './ErrorView';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { strings } from '../../../../../../../locales/i18n';

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

  it('renders with default props', () => {
    renderWithProvider(() => <ErrorView />);
    expect(
      screen.getByText(strings('deposit.error_view.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('deposit.error_view.description')),
    ).toBeOnTheScreen();
  });

  it('renders with all props', () => {
    renderWithProvider(() => (
      <ErrorView
        title="Custom Error Title"
        description="Custom error description"
        ctaLabel="custom cta label"
        ctaOnPress={mockCtaOnPress}
      />
    ));
    expect(screen.getByText('Custom Error Title')).toBeOnTheScreen();
    expect(screen.getByText('Custom error description')).toBeOnTheScreen();
    expect(screen.getByText('custom cta label')).toBeOnTheScreen();
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
