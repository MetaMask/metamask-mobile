import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsFeesDisplay from './PerpsFeesDisplay';

jest.mock('../../../Rewards/components/RewardsVipBadge/RewardsVipBadge', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      MockReact.createElement(View, { testID: 'rewards-vip-badge' }),
  };
});

describe('PerpsFeesDisplay', () => {
  describe('Discount visibility', () => {
    it('does not show discounted fee when feeDiscountPercentage is undefined', () => {
      const { queryByTestId, getByTestId } = render(
        <PerpsFeesDisplay fee={10} testID="fee" />,
      );

      expect(getByTestId('fee')).toBeTruthy();
      expect(queryByTestId('fee-original')).toBeNull();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });

    it('does not show discounted fee when feeDiscountPercentage is zero', () => {
      const { queryByTestId } = render(
        <PerpsFeesDisplay
          fee={10}
          feeDiscountPercentage={0}
          originalFee={12}
          testID="fee"
        />,
      );

      expect(queryByTestId('fee-original')).toBeNull();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });

    it('does not show discounted fee when feeDiscountPercentage is negative', () => {
      const { queryByTestId } = render(
        <PerpsFeesDisplay
          fee={10}
          feeDiscountPercentage={-5}
          originalFee={12}
          testID="fee"
        />,
      );

      expect(queryByTestId('fee-original')).toBeNull();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });

    it('does not show strikethrough when originalFee is missing', () => {
      const { queryByTestId } = render(
        <PerpsFeesDisplay fee={10} feeDiscountPercentage={15} testID="fee" />,
      );

      expect(queryByTestId('fee-original')).toBeNull();
    });

    it('does not show strikethrough when originalFee equals fee', () => {
      const { queryByTestId } = render(
        <PerpsFeesDisplay
          fee={10}
          feeDiscountPercentage={15}
          originalFee={10}
          testID="fee"
        />,
      );

      expect(queryByTestId('fee-original')).toBeNull();
    });

    it('shows strikethrough original and discounted fee when discount and originalFee are provided', () => {
      const { getByTestId } = render(
        <PerpsFeesDisplay
          fee={8.5}
          feeDiscountPercentage={15}
          originalFee={10}
          testID="fee"
        />,
      );

      expect(getByTestId('fee-original')).toBeTruthy();
      expect(getByTestId('fee')).toBeTruthy();
    });
  });

  describe('Fee text rendering', () => {
    it('renders the formatted fee when fee is provided', () => {
      const { getByTestId } = render(
        <PerpsFeesDisplay fee={25.5} testID="fee" />,
      );

      expect(getByTestId('fee')).toBeTruthy();
    });

    it('renders placeholder when fee is undefined', () => {
      const { getByText } = render(<PerpsFeesDisplay fee={undefined} />);

      expect(getByText('--')).toBeTruthy();
    });

    it('renders custom placeholder when fee is undefined', () => {
      const { getByText } = render(
        <PerpsFeesDisplay fee={undefined} placeholder="-" />,
      );

      expect(getByText('-')).toBeTruthy();
    });
  });

  describe('VIP badge', () => {
    it('does not render the VIP badge by default', () => {
      const { queryByTestId } = render(<PerpsFeesDisplay fee={10} />);

      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });

    it('does not render VIP badge when discount is active but no accountId', () => {
      const { queryByTestId } = render(
        <PerpsFeesDisplay
          fee={10}
          feeDiscountPercentage={10}
          originalFee={12}
        />,
      );

      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });

    it('renders the VIP badge when a discount is active and accountId is provided', () => {
      const { getByTestId } = render(
        <PerpsFeesDisplay
          fee={10}
          feeDiscountPercentage={10}
          originalFee={12}
          accountId={'eip155:1:0x1234'}
        />,
      );

      expect(getByTestId('rewards-vip-badge')).toBeTruthy();
    });

    it('renders VIP badge alongside strikethrough and fee text', () => {
      const { getByTestId } = render(
        <PerpsFeesDisplay
          fee={8.5}
          feeDiscountPercentage={15}
          originalFee={10}
          testID="fee"
          accountId={'eip155:1:0x1234'}
        />,
      );

      expect(getByTestId('rewards-vip-badge')).toBeTruthy();
      expect(getByTestId('fee-original')).toBeTruthy();
      expect(getByTestId('fee')).toBeTruthy();
    });
  });
});
