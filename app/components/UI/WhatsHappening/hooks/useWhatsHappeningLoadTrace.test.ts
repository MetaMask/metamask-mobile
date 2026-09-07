import { renderHook } from '@testing-library/react-native';
import { TraceName } from '../../../../util/trace';
import { useWhatsHappeningLoadTrace } from './useWhatsHappeningLoadTrace';
import { WhatsHappeningSource } from '../constants';

const mockTrace = jest.fn();
const mockEndTrace = jest.fn();

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: (...args: unknown[]) => mockTrace(...args),
  endTrace: (...args: unknown[]) => mockEndTrace(...args),
}));

const defaultParams = {
  name: TraceName.WhatsHappeningCarouselLoad,
  enabled: true,
  source: WhatsHappeningSource.Explore,
  stage: 'carousel' as const,
  cacheState: 'cold' as const,
  isGenerationPending: true,
  hasContent: false,
  error: null,
};

describe('useWhatsHappeningLoadTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts carousel time to content with bounded attributes', () => {
    const { result } = renderHook(() =>
      useWhatsHappeningLoadTrace(defaultParams),
    );

    expect(result.current).toBe('explore:carousel');
    expect(mockTrace).toHaveBeenCalledWith({
      name: "What's Happening Carousel Load",
      op: 'whats_happening.load',
      id: 'explore:carousel',
      tags: {
        feature: 'whats_happening',
        source: 'explore',
        stage: 'carousel',
        cache_state: 'cold',
      },
    });
  });

  it('does not start a span when start is false', () => {
    renderHook(() =>
      useWhatsHappeningLoadTrace({
        ...defaultParams,
        start: false,
      }),
    );

    expect(mockTrace).not.toHaveBeenCalled();
  });

  it('ends carousel time to content with an empty result', () => {
    renderHook(() =>
      useWhatsHappeningLoadTrace({
        ...defaultParams,
        isGenerationPending: false,
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: "What's Happening Carousel Load",
      id: 'explore:carousel',
      data: {
        result: 'empty',
        success: true,
        content_state: 'empty',
      },
    });
  });

  it('ends carousel time to content with an error result', () => {
    renderHook(() =>
      useWhatsHappeningLoadTrace({
        ...defaultParams,
        isGenerationPending: false,
        error: 'request failed',
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: "What's Happening Carousel Load",
      id: 'explore:carousel',
      data: {
        result: 'error',
        success: false,
        content_state: 'error',
      },
    });
  });

  it('ends carousel time to content as cancelled on unmount', () => {
    const { unmount } = renderHook(() =>
      useWhatsHappeningLoadTrace(defaultParams),
    );

    unmount();

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: "What's Happening Carousel Load",
      id: 'explore:carousel',
      data: {
        result: 'cancelled',
        success: false,
        reason: 'owner_cancelled',
      },
    });
  });
});
