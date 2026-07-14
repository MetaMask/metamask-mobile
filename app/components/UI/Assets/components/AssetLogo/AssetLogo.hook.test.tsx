import { renderHook, act } from '@testing-library/react-native';
import { ImageURISource } from 'react-native';
import { useSmartImageFallback } from './AssetLogo.hook';

const createImageSource = (uri?: string): ImageURISource => ({ uri });

const createSourcesFromUris = (
  uris: (string | undefined)[],
): ImageURISource[] => uris.map((uri) => createImageSource(uri));

describe('useSmartImageFallback', () => {
  const markUriAsDead = (uri: string) => {
    const { result } = renderHook(() =>
      useSmartImageFallback([createImageSource(uri)]),
    );

    act(() => {
      result.current.onError();
    });
  };

  const initialSourceCases = [
    {
      description: 'first source with uri',
      deadUris: [] as string[],
      uris: [
        'https://example.com/initial-primary.png',
        'https://example.com/initial-fallback.png',
      ],
      expectedSourceIndex: 0,
      expectedKey: 'https://example.com/initial-primary.png-0',
    },
    {
      description: 'second source when first has no uri',
      deadUris: [] as string[],
      uris: [undefined, 'https://example.com/no-uri-fallback.png'],
      expectedSourceIndex: 1,
      expectedKey: 'https://example.com/no-uri-fallback.png-0',
    },
    {
      description: 'second source when first uri is dead',
      deadUris: ['https://example.com/dead.png'],
      uris: ['https://example.com/dead.png', 'https://example.com/active.png'],
      expectedSourceIndex: 1,
      expectedKey: 'https://example.com/active.png-0',
    },
    {
      description: 'last source when all valid sources are filtered out',
      deadUris: [] as string[],
      uris: [undefined, 'https://example.com/last.png'],
      expectedSourceIndex: 1,
      expectedKey: 'https://example.com/last.png-0',
    },
  ] as const;

  it.each(initialSourceCases)(
    'returns $description',
    ({ deadUris, uris, expectedSourceIndex, expectedKey }) => {
      deadUris.forEach((uri) => {
        markUriAsDead(uri);
      });
      const sources = createSourcesFromUris([...uris]);

      const { result } = renderHook(() => useSmartImageFallback(sources));

      expect(result.current.source).toStrictEqual(sources[expectedSourceIndex]);
      expect(result.current.uniqueSourceImageKey).toBe(expectedKey);
    },
  );

  const onErrorCases = [
    {
      description: 'advances to next valid source',
      uris: [
        'https://example.com/onerror-advance-primary.png',
        'https://example.com/onerror-advance-fallback.png',
      ],
      errorCount: 1,
      expectedSourceIndex: 1,
      expectedKey: 'https://example.com/onerror-advance-fallback.png-1',
    },
    {
      description: 'last valid source when called repeatedly',
      uris: [
        'https://example.com/onerror-repeat-primary.png',
        'https://example.com/onerror-repeat-fallback.png',
      ],
      errorCount: 3,
      expectedSourceIndex: 1,
      expectedKey: 'https://example.com/onerror-repeat-fallback.png-1',
    },
  ] as const;

  it.each(onErrorCases)(
    'onError $description',
    ({ uris, errorCount, expectedSourceIndex, expectedKey }) => {
      const sources = createSourcesFromUris([...uris]);

      const { result } = renderHook(() => useSmartImageFallback(sources));

      act(() => {
        for (let index = 0; index < errorCount; index++) {
          result.current.onError();
        }
      });

      expect(result.current.source).toStrictEqual(sources[expectedSourceIndex]);
      expect(result.current.uniqueSourceImageKey).toBe(expectedKey);

      const { result: freshResult } = renderHook(() =>
        useSmartImageFallback(sources),
      );

      expect(freshResult.current.source).toStrictEqual(sources[1]);
    },
  );

  it('updates source when sources change', () => {
    const initialSources = [
      createImageSource('https://example.com/initial.png'),
    ];
    const updatedSources = [
      createImageSource('https://example.com/updated.png'),
    ];

    const { result, rerender } = renderHook(
      ({ hookSources }) => useSmartImageFallback(hookSources),
      { initialProps: { hookSources: initialSources } },
    );

    expect(result.current.source).toStrictEqual(initialSources[0]);

    rerender({ hookSources: updatedSources });

    expect(result.current.source).toStrictEqual(updatedSources[0]);
  });

  it('resets fallback index when sources change after onError cycles', () => {
    const initialSources = createSourcesFromUris([
      'https://example.com/reset-token-a-primary.png',
      'https://example.com/reset-token-a-fallback.png',
    ]);
    const newSources = createSourcesFromUris([
      'https://example.com/reset-token-b-primary.png',
      'https://example.com/reset-token-b-fallback.png',
    ]);

    const { result, rerender } = renderHook(
      ({ hookSources }) => useSmartImageFallback(hookSources),
      { initialProps: { hookSources: initialSources } },
    );

    act(() => {
      result.current.onError();
    });
    expect(result.current.source).toStrictEqual(initialSources[1]);

    rerender({ hookSources: newSources });

    expect(result.current.source).toStrictEqual(newSources[0]);
  });

  it('preserves fallback index when sources reference changes but URIs stay the same', () => {
    const makeSources = () =>
      createSourcesFromUris([
        'https://example.com/stable-ref-primary.png',
        'https://example.com/stable-ref-fallback.png',
      ]);

    const { result, rerender } = renderHook(
      ({ hookSources }) => useSmartImageFallback(hookSources),
      { initialProps: { hookSources: makeSources() } },
    );

    act(() => {
      result.current.onError();
    });
    const sourceAfterError = result.current.source;
    expect(sourceAfterError).toStrictEqual({
      uri: 'https://example.com/stable-ref-fallback.png',
    });

    rerender({ hookSources: makeSources() });

    expect(result.current.source).toStrictEqual(sourceAfterError);
  });

  it('persists dead images across hook instances', () => {
    const sources = createSourcesFromUris([
      'https://example.com/persist-primary.png',
      'https://example.com/persist-fallback.png',
    ]);

    const { result: firstResult } = renderHook(() =>
      useSmartImageFallback(sources),
    );

    act(() => {
      firstResult.current.onError();
    });

    const { result: secondResult } = renderHook(() =>
      useSmartImageFallback(sources),
    );

    expect(secondResult.current.source).toStrictEqual(sources[1]);
  });
});
