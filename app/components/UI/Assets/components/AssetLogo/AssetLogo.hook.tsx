import { useMemo, useRef, useState } from 'react';
import { ImageURISource } from 'react-native';
import { createRotatingSet } from './AssetLogo.utils';

const deadImages = createRotatingSet<string>();
export function useSmartImageFallback(sources: ImageURISource[]) {
  const validSources = useMemo(
    () => sources.filter((src) => src.uri && !deadImages.has(src.uri)),
    [sources],
  );
  const LAST_ITEM_INDEX = validSources.length - 1;

  const [index, setIndex] = useState(0);
  const uriKey = sources.map((s) => s.uri ?? '').join('\0');
  const prevUriKeyRef = useRef(uriKey);
  if (prevUriKeyRef.current !== uriKey) {
    prevUriKeyRef.current = uriKey;
    setIndex(0);
  }
  const currentSource: ImageURISource | undefined =
    validSources[index] || sources[sources.length - 1];

  const onError = () => {
    if (currentSource?.uri) {
      deadImages.add(currentSource.uri);
    }
    setIndex((prev) => Math.min(prev + 1, LAST_ITEM_INDEX)); // Cycle to next valid source
  };

  // Ensures item refresh on failure
  const uniqueSourceImageKey = `${currentSource?.uri}-${index}`;

  return { source: currentSource, onError, uniqueSourceImageKey };
}
