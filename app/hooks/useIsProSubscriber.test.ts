import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useIsProSubscriber } from './useIsProSubscriber';
import {
  selectHasAnyMoneyAccountPlusEntitlement,
  selectIsMoneyAccountPlusSubscriber,
} from '../selectors/subscriptionController';
import { useResolveMoneyAccountPlusEntitlements } from './useResolveMoneyAccountPlusEntitlements';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useResolveMoneyAccountPlusEntitlements', () => ({
  useResolveMoneyAccountPlusEntitlements: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseResolveMoneyAccountPlusEntitlements = jest.mocked(
  useResolveMoneyAccountPlusEntitlements,
);

describe('useIsProSubscriber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      isSubscriber: true,
      hasEntitlement: false,
      expected: true,
    },
    {
      isSubscriber: false,
      hasEntitlement: true,
      expected: true,
    },
    {
      isSubscriber: true,
      hasEntitlement: true,
      expected: true,
    },
    {
      isSubscriber: false,
      hasEntitlement: false,
      expected: false,
    },
  ])(
    'returns $expected when subscriber is $isSubscriber and entitlement is $hasEntitlement',
    ({ isSubscriber, hasEntitlement, expected }) => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectIsMoneyAccountPlusSubscriber) {
          return isSubscriber;
        }
        if (selector === selectHasAnyMoneyAccountPlusEntitlement) {
          return hasEntitlement;
        }
        return undefined;
      });

      const { result } = renderHook(() => useIsProSubscriber());

      expect(mockUseResolveMoneyAccountPlusEntitlements).toHaveBeenCalledTimes(
        1,
      );
      expect(result.current).toBe(expected);
    },
  );
});
