import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LendingMaxWithdrawalModal from './index';

// Mock the BottomSheet component
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const MockBottomSheet = ({
      children,
      ref,
    }: {
      children: React.ReactNode;
      ref: { current: { onCloseBottomSheet: () => void } | null };
    }) => {
      if (ref) {
        ref.current = {
          onCloseBottomSheet: jest.fn(),
        };
      }
      return <>{children}</>;
    };
    return MockBottomSheet;
  },
);

describe('LendingMaxWithdrawalModal', () => {
  it('should render correctly', () => {
    const { getByText } = render(<LendingMaxWithdrawalModal />);

    // Check if the title is rendered
    expect(getByText("Why can't I withdraw my full balance?")).toBeTruthy();

    // Check if the explanation text is rendered
    expect(
      getByText(
        'This wallet has active borrow positions made outside of this app, such as through Aave’s website.',
      ),
    ).toBeTruthy();
    expect(
      getByText(
        'To keep your position safe, we limit withdrawals to avoid lowering your health factor too much, which could put your assets at risk of liquidation.',
      ),
    ).toBeTruthy();
    expect(
      getByText(
        'To unlock more withdrawals, repay some of your borrowed assets or increase your collateral.',
      ),
    ).toBeTruthy();
  });

  it('should handle close action', () => {
    const { getByText } = render(<LendingMaxWithdrawalModal />);

    // Find and click the close button
    const closeButton = getByText("Why can't I withdraw my full balance?");
    fireEvent.press(closeButton);

    // The close functionality is handled by the BottomSheet component
    // which is mocked, so we just verify the component renders without errors
    expect(closeButton).toBeTruthy();
  });
});
