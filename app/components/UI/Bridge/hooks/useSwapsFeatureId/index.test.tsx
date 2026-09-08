import React from 'react';
import { render, renderHook } from '@testing-library/react-native';
import { FeatureId } from '@metamask/bridge-controller';
import { SwapsFeatureIdProvider } from '../../providers/SwapsFeatureIdProvider';
import { useSwapsFeatureId } from './index';

const wrapWithProvider =
  (featureId: FeatureId) =>
  ({ children }: { children: React.ReactNode }) => (
    <SwapsFeatureIdProvider featureId={featureId}>
      {children}
    </SwapsFeatureIdProvider>
  );

const FeatureIdReader = () => {
  useSwapsFeatureId();
  return null;
};

describe('useSwapsFeatureId', () => {
  it('returns the feature id supplied by the nearest provider', () => {
    const { result } = renderHook(() => useSwapsFeatureId(), {
      wrapper: wrapWithProvider(FeatureId.UNIFIED_SWAP_BRIDGE),
    });

    expect(result.current).toBe(FeatureId.UNIFIED_SWAP_BRIDGE);
  });

  it.each([
    FeatureId.UNIFIED_SWAP_BRIDGE,
    FeatureId.LIMIT_ORDER,
    FeatureId.RECURRING_BUY,
    FeatureId.BATCH_SELL,
  ])('returns %s when the provider is scoped to that flow', (featureId) => {
    const { result } = renderHook(() => useSwapsFeatureId(), {
      wrapper: wrapWithProvider(featureId),
    });

    expect(result.current).toBe(featureId);
  });

  it('throws when rendered without a SwapsFeatureIdProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(jest.fn);

    const renderWithoutProvider = () => render(<FeatureIdReader />);

    expect(renderWithoutProvider).toThrow(
      'useFeatureId must be used within FeatureIdProvider',
    );
  });
});
