import React from 'react';
import { ButtonType } from '@metamask/snaps-sdk';
import { render, screen } from '@testing-library/react-native';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button/Button.types';
import { SnapUIFooterButton } from './SnapUIFooterButton';
import { ActivityIndicator } from 'react-native';

const mockHandleEvent = jest.fn();
jest.mock('../SnapInterfaceContext', () => ({
  useSnapInterfaceContext: () => ({
    snapId: 'mock-snap-id',
    handleEvent: mockHandleEvent,
  }),
}));

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: (selector: any) => mockUseSelector(selector),
}));

describe('SnapUIFooterButton', () => {
  beforeEach(() => {
    mockHandleEvent.mockClear();
    mockUseSelector.mockReturnValue({
      'mock-snap-id': {
        id: 'mock-snap-id',
        hideSnapBranding: false,
      },
    });
  });

  const defaultProps = {
    children: 'Test Button',
    type: ButtonType.Submit,
    snapVariant: 'primary' as const,
    onPress: jest.fn(),
    variant: ButtonVariants.Primary,
    accessibilityLabel: 'Test Button',
  };

  it('renders button with snap branding when isSnapAction is true', () => {
    render(<SnapUIFooterButton {...defaultProps} isSnapAction />);
    expect(screen.getByText('Test Button')).toBeTruthy();
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('renders button without snap branding when hideSnapBranding is true', () => {
    mockUseSelector.mockReturnValue({
      'mock-snap-id': {
        id: 'mock-snap-id',
        hideSnapBranding: true,
      },
    });
    render(<SnapUIFooterButton {...defaultProps} isSnapAction />);
    expect(screen.getByText('Test Button')).toBeTruthy();
    expect(screen.queryByText('?')).toBeNull();
  });

  it('shows loading state', () => {
    render(<SnapUIFooterButton {...defaultProps} loading />);
    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button.findByType(ActivityIndicator)).toBeTruthy();
  });

  it('applies correct variant based on disabled state', () => {
    render(<SnapUIFooterButton {...defaultProps} disabled />);
    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button.props.disabled).toBe(true);
  });
});
