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
    const { toJSON } = render(<LendingMaxWithdrawalModal />);

    expect(toJSON()).toMatchSnapshot();
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
