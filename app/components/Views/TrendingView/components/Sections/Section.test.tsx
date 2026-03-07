import React from 'react';
import { View, Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import Section, { RefreshConfig } from './Section';
import type { SectionId } from '../../sections.config';

const mockRefetch = jest.fn();
const mockUseSectionData = jest.fn().mockReturnValue({
  data: [{ id: '1' }, { id: '2' }],
  isLoading: false,
  isFetching: false,
  refetch: mockRefetch,
});

const MockSection = ({
  data,
  isLoading,
}: {
  data: unknown[];
  isLoading: boolean;
}) => (
  <View testID="mock-section">
    <Text testID="data-length">{data.length}</Text>
    <Text testID="is-loading">{String(isLoading)}</Text>
  </View>
);

jest.mock('../../sections.config', () => ({
  SECTIONS_CONFIG: {
    tokens: {
      useSectionData: (...args: unknown[]) => mockUseSectionData(...args),
      Section: (props: { data: unknown[]; isLoading: boolean }) =>
        MockSection(props),
    },
  },
}));

describe('Section', () => {
  const defaultProps = {
    sectionId: 'tokens' as SectionId,
    refreshConfig: { trigger: 0, silentRefresh: false } as RefreshConfig,
    toggleSectionEmptyState: jest.fn(),
    toggleSectionLoadingState: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSectionData.mockReturnValue({
      data: [{ id: '1' }, { id: '2' }],
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });
  });

  it('renders the section component with data', () => {
    const { getByTestId } = render(<Section {...defaultProps} />);
    expect(getByTestId('mock-section')).toBeTruthy();
    expect(getByTestId('data-length').props.children).toBe(2);
  });

  it('calls toggleSectionEmptyState with false when data is present', async () => {
    render(<Section {...defaultProps} />);
    await waitFor(() => {
      expect(defaultProps.toggleSectionEmptyState).toHaveBeenCalledWith(false);
    });
  });

  it('calls toggleSectionEmptyState with true when data is empty', async () => {
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });
    render(<Section {...defaultProps} />);
    await waitFor(() => {
      expect(defaultProps.toggleSectionEmptyState).toHaveBeenCalledWith(true);
    });
  });

  it('does not call toggleSectionEmptyState while loading', () => {
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: true,
      refetch: mockRefetch,
    });
    render(<Section {...defaultProps} />);
    expect(defaultProps.toggleSectionEmptyState).not.toHaveBeenCalled();
  });

  it('calls toggleSectionLoadingState with current loading state', async () => {
    render(<Section {...defaultProps} />);
    await waitFor(() => {
      expect(defaultProps.toggleSectionLoadingState).toHaveBeenCalledWith(
        false,
      );
    });
  });

  it('calls refetch when refreshConfig.trigger increments', () => {
    const { rerender } = render(<Section {...defaultProps} />);
    expect(mockRefetch).not.toHaveBeenCalled();

    rerender(
      <Section
        {...defaultProps}
        refreshConfig={{ trigger: 1, silentRefresh: false }}
      />,
    );
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('does not call refetch when trigger is 0', () => {
    render(
      <Section
        {...defaultProps}
        refreshConfig={{ trigger: 0, silentRefresh: false }}
      />,
    );
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('shows skeleton when loading during silent refresh', () => {
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: true,
      refetch: mockRefetch,
    });
    const { getByTestId } = render(
      <Section
        {...defaultProps}
        refreshConfig={{ trigger: 0, silentRefresh: true }}
      />,
    );
    expect(getByTestId('is-loading').props.children).toBe('true');
  });

  it('does not show skeleton when loading without silent refresh', () => {
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: true,
      refetch: mockRefetch,
    });
    const { getByTestId } = render(
      <Section
        {...defaultProps}
        refreshConfig={{ trigger: 0, silentRefresh: false }}
      />,
    );
    expect(getByTestId('is-loading').props.children).toBe('false');
  });

  it('shows skeleton when isFetching with empty data during silent refresh', () => {
    mockUseSectionData.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: true,
      refetch: mockRefetch,
    });
    const { getByTestId } = render(
      <Section
        {...defaultProps}
        refreshConfig={{ trigger: 0, silentRefresh: true }}
      />,
    );
    expect(getByTestId('is-loading').props.children).toBe('true');
  });

  it('does not show skeleton when isFetching with existing data', () => {
    mockUseSectionData.mockReturnValue({
      data: [{ id: '1' }],
      isLoading: false,
      isFetching: true,
      refetch: mockRefetch,
    });
    const { getByTestId } = render(
      <Section
        {...defaultProps}
        refreshConfig={{ trigger: 0, silentRefresh: true }}
      />,
    );
    expect(getByTestId('is-loading').props.children).toBe('false');
  });
});
