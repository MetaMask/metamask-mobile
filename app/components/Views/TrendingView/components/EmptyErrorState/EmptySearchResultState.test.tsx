import React from 'react';
import { render } from '@testing-library/react-native';
import EmptySearchResultState from './EmptySearchResultState';

describe('EmptySearchResultState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty search result state with title and description', () => {
    const { getByText } = render(<EmptySearchResultState />);

    expect(getByText('No tokens found')).toBeDefined();
    expect(getByText('We were not able to find this token')).toBeDefined();
  });

  it('renders with correct test ID', () => {
    const { getByTestId } = render(<EmptySearchResultState />);

    expect(getByTestId('empty-search-result-state')).toBeDefined();
  });

  it('does not render try again button', () => {
    const { queryByText } = render(<EmptySearchResultState />);

    expect(queryByText('Try again')).toBeNull();
  });
});
