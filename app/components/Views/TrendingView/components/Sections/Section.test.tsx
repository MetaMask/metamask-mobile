import React from 'react';
import { View } from 'react-native';
import { render, act } from '@testing-library/react-native';
import Section from './Section';
import { SECTIONS_CONFIG } from '../../sections.config';

interface MockSectionProps {
  isLoading: boolean;
  sectionId: string;
  data: unknown[];
}

// Store the mock component to allow direct element creation
const MockSectionComponent: React.FC<MockSectionProps> = ({ isLoading }) => (
  <View testID="mock-section" data-isloading={isLoading.toString()} />
);

// Mock sections.config
jest.mock('../../sections.config', () => ({
  SECTIONS_CONFIG: {
    tokens: {
      Section: jest.fn(),
      useSectionData: jest.fn(() => ({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      })),
    },
  },
}));

// Set the mock Section component after the mock is initialized
beforeAll(() => {
  (SECTIONS_CONFIG.tokens.Section as jest.Mock).mockImplementation(
    MockSectionComponent,
  );
});

const mockUseSectionData = SECTIONS_CONFIG.tokens.useSectionData as jest.Mock;

describe('Section', () => {
  const mockToggleSectionEmptyState = jest.fn();
  const mockToggleSectionLoadingState = jest.fn();

  const defaultProps = {
    sectionId: 'tokens' as const,
    refreshConfig: {
      trigger: 0,
      silentRefresh: true,
    },
    toggleSectionEmptyState: mockToggleSectionEmptyState,
    toggleSectionLoadingState: mockToggleSectionLoadingState,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not show skeleton immediately when loading starts', () => {
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(<Section {...defaultProps} />);

    const sectionElement = getByTestId('mock-section');
    // Skeleton should NOT be shown immediately (grace period not elapsed)
    expect(sectionElement.props['data-isloading']).toBe('false');
  });

  it('shows skeleton after grace period (200ms) when still loading', () => {
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(<Section {...defaultProps} />);

    // Before grace period
    expect(getByTestId('mock-section').props['data-isloading']).toBe('false');

    // Advance timer past grace period
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // After grace period - skeleton should now be shown
    expect(getByTestId('mock-section').props['data-isloading']).toBe('true');
  });

  it('does not show skeleton if loading completes before grace period', () => {
    const mockRefetch = jest.fn();
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: mockRefetch,
    });

    const { getByTestId, rerender } = render(<Section {...defaultProps} />);

    // Skeleton not shown immediately
    expect(getByTestId('mock-section').props['data-isloading']).toBe('false');

    // Advance timer partially (before grace period)
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Still not shown
    expect(getByTestId('mock-section').props['data-isloading']).toBe('false');

    // Loading completes before grace period ends
    mockUseSectionData.mockReturnValue({
      data: [{ id: 1 }],
      isLoading: false,
      refetch: mockRefetch,
    });

    rerender(<Section {...defaultProps} />);

    // Advance remaining time
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Skeleton should never be shown since loading completed before grace period
    expect(getByTestId('mock-section').props['data-isloading']).toBe('false');
  });

  it('does not show skeleton when silentRefresh is false', () => {
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
    });

    const props = {
      ...defaultProps,
      refreshConfig: {
        trigger: 0,
        silentRefresh: false,
      },
    };

    const { getByTestId } = render(<Section {...props} />);

    // Advance past grace period
    act(() => {
      jest.advanceTimersByTime(250);
    });

    // Skeleton should NOT be shown when silentRefresh is false
    expect(getByTestId('mock-section').props['data-isloading']).toBe('false');
  });

  it('calls toggleSectionEmptyState when loading completes', () => {
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
    });

    const { rerender } = render(<Section {...defaultProps} />);

    // Initially loading - should not call empty state callback
    expect(mockToggleSectionEmptyState).not.toHaveBeenCalled();

    // Loading completes with empty data
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    rerender(<Section {...defaultProps} />);

    expect(mockToggleSectionEmptyState).toHaveBeenCalledWith(true);
  });

  it('calls toggleSectionLoadingState when loading state changes', () => {
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
    });

    const { rerender } = render(<Section {...defaultProps} />);

    expect(mockToggleSectionLoadingState).toHaveBeenCalledWith(true);

    mockUseSectionData.mockReturnValue({
      data: [{ id: 1 }],
      isLoading: false,
      refetch: jest.fn(),
    });

    rerender(<Section {...defaultProps} />);

    expect(mockToggleSectionLoadingState).toHaveBeenCalledWith(false);
  });

  it('triggers refetch when refreshConfig.trigger changes', () => {
    const mockRefetch = jest.fn();
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
    });

    const { rerender } = render(<Section {...defaultProps} />);

    // Initial render with trigger = 0 should not call refetch
    expect(mockRefetch).not.toHaveBeenCalled();

    // Update with trigger > 0
    rerender(
      <Section
        {...defaultProps}
        refreshConfig={{ trigger: 1, silentRefresh: true }}
      />,
    );

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
