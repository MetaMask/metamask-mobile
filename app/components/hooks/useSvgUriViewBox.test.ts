import { renderHook, waitFor } from '@testing-library/react-native';
import useSvgUriViewBox from './useSvgUriViewBox';

describe('useSvgUriViewBox()', () => {
  const MOCK_SVG_WITH_VIEWBOX = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none"></svg>`;
  const MOCK_SVG_WITHOUT_VIEWBOX = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="none"></svg>`;

  function arrangeMocks() {
    const mockResponseTextFn = jest
      .fn()
      .mockResolvedValue(MOCK_SVG_WITHOUT_VIEWBOX);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ text: mockResponseTextFn } as unknown as Response);

    return { mockText: mockResponseTextFn };
  }

  it('should return view-box if svg if missing a view-box', async () => {
    const { mockText } = arrangeMocks();
    mockText.mockResolvedValueOnce(MOCK_SVG_WITHOUT_VIEWBOX);

    const hook = renderHook(() => useSvgUriViewBox('URI', true));
    await waitFor(() => expect(hook.result.current).toBeDefined());
  });

  it('should return view-box if svg already has view-box', async () => {
    const { mockText } = arrangeMocks();
    mockText.mockResolvedValueOnce(MOCK_SVG_WITH_VIEWBOX);

    const hook = renderHook(() => useSvgUriViewBox('URI', true));
    await waitFor(() => expect(hook.result.current).toBeDefined());
  });

  it('should not make async calls if image is not an svg', async () => {
    const mocks = arrangeMocks();
    const hook = renderHook(() => useSvgUriViewBox('URI', false));

    await waitFor(() => expect(hook.result.current).toBeUndefined());
    expect(mocks.mockText).not.toHaveBeenCalled();
  });
});
