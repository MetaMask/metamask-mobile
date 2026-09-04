import React from 'react';
import { FeatureIdProvider } from './FeatureIdContext';
import { useSwapFeatureId } from './index';
import { renderHook } from '@testing-library/react-native';
import { FeatureId } from '@metamask/bridge-controller';

const Wrapper = ({
  children,
  featureId,
}: {
  children: React.ReactNode;
  featureId: FeatureId;
}) => {
  return (
    <FeatureIdProvider featureId={featureId}>{children}</FeatureIdProvider>
  );
};

describe('useSwapFeatureId', () => {
  it('throws an error if used outside of FeatureIdProvider', () => {
    expect(() => renderHook(() => useSwapFeatureId())).toThrow(
      'useSwapFeatureId must be used within FeatureIdProvider',
    );
  });

  it('returns the correct feature id for the limit order tab', () => {
    expect(
      renderHook(() => useSwapFeatureId(), {
        wrapper: ({ children }) => (
          <Wrapper featureId={FeatureId.LIMIT_ORDER}>{children}</Wrapper>
        ),
      }).result.current,
    ).toBe(FeatureId.LIMIT_ORDER);
  });

  it('returns the correct feature id for the recurring buy tab', () => {
    expect(
      renderHook(() => useSwapFeatureId(), {
        wrapper: ({ children }) => (
          <Wrapper featureId={FeatureId.RECURRING_BUY}>{children}</Wrapper>
        ),
      }).result.current,
    ).toBe(FeatureId.RECURRING_BUY);
  });

  it('returns the correct feature id for the market tab', () => {
    expect(
      renderHook(() => useSwapFeatureId(), {
        wrapper: ({ children }) => (
          <Wrapper featureId={FeatureId.UNIFIED_SWAP_BRIDGE}>
            {children}
          </Wrapper>
        ),
      }).result.current,
    ).toBe(FeatureId.UNIFIED_SWAP_BRIDGE);
  });
});
