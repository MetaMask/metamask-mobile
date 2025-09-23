import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { DefiEmptyState } from './DefiEmptyState';
import { fireEvent } from '@testing-library/react-native';

describe('DefiEmptyState', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<DefiEmptyState />);
    expect(
      getByText('Lend, borrow, and trade, right in your wallet.'),
    ).toBeDefined();
    expect(getByText('Explore DeFi')).toBeDefined();
  });

  it('should call custom onExploreDefi when provided', () => {
    const mockOnExploreDefi = jest.fn();
    const { getByText } = renderWithProvider(
      <DefiEmptyState onExploreDefi={mockOnExploreDefi} />,
    );

    const button = getByText('Explore DeFi');
    fireEvent.press(button);

    expect(mockOnExploreDefi).toHaveBeenCalledTimes(1);
  });
});
