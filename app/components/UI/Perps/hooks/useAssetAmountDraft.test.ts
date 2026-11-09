import { act, renderHook } from '@testing-library/react-native';
import { useAssetAmountDraft } from './useAssetAmountDraft';

describe('useAssetAmountDraft', () => {
  it('seeds the draft from the current coin amount when coin input starts', () => {
    const { result, rerender } = renderHook(
      (props: { isActive: boolean; usdAmount: string; assetAmount: string }) =>
        useAssetAmountDraft(props),
      {
        initialProps: {
          isActive: false,
          usdAmount: '10',
          assetAmount: '1,210.000',
        },
      },
    );

    rerender({ isActive: true, usdAmount: '10', assetAmount: '1,210.000' });

    expect(result.current.draft).toBe('1210');
  });

  it('keeps a typed draft when the committed USD amount echoes back', () => {
    const { result, rerender } = renderHook(
      (props: { isActive: boolean; usdAmount: string; assetAmount: string }) =>
        useAssetAmountDraft(props),
      {
        initialProps: {
          isActive: true,
          usdAmount: '10',
          assetAmount: '1210',
        },
      },
    );

    act(() => {
      result.current.setDraftFromKeypad('1', '0.00826446');
    });
    rerender({
      isActive: true,
      usdAmount: '0.00826446',
      assetAmount: '999',
    });

    expect(result.current.draft).toBe('1');
  });

  it('replaces the draft when the USD amount changes from another input', () => {
    const { result, rerender } = renderHook(
      (props: { isActive: boolean; usdAmount: string; assetAmount: string }) =>
        useAssetAmountDraft(props),
      {
        initialProps: {
          isActive: true,
          usdAmount: '0.00826446',
          assetAmount: '1',
        },
      },
    );

    act(() => {
      result.current.setDraftFromKeypad('1', '0.00826446');
    });
    rerender({ isActive: true, usdAmount: '5', assetAmount: '600' });

    expect(result.current.draft).toBe('600');
  });
});
