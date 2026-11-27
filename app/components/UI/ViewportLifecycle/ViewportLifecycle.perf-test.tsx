import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { measureRenders } from 'reassure';
import ViewportLifecycle from './ViewportLifecycle';
import {
  ScrollViewportProvider,
  type ViewportPublisher,
} from './ScrollViewportContext';

const SECTION_COUNT = 8;
const ROWS_PER_SECTION = 40;

function HeavySection({ id }: { id: number }) {
  return (
    <View>
      {Array.from({ length: ROWS_PER_SECTION }, (_, row) => (
        <Text key={row}>
          {id}-{row}
        </Text>
      ))}
    </View>
  );
}

function AlwaysMountedPage() {
  return (
    <View>
      {Array.from({ length: SECTION_COUNT }, (_, id) => (
        <HeavySection key={id} id={id} />
      ))}
    </View>
  );
}

function LazyMountedPage() {
  const publishRef = useRef<ViewportPublisher | null>(null);

  useEffect(() => {
    publishRef.current?.publishBounds({ top: 0, height: 800 });
  }, []);

  return (
    <ScrollViewportProvider publishRef={publishRef}>
      <HeavySection id={0} />
      {Array.from({ length: SECTION_COUNT - 1 }, (_, index) => (
        <ViewportLifecycle
          key={index + 1}
          mode="unmount-when-far"
          initiallyMounted={false}
          placeholderHeight={320}
        >
          <HeavySection id={index + 1} />
        </ViewportLifecycle>
      ))}
    </ScrollViewportProvider>
  );
}

describe('ViewportLifecycle render cost', () => {
  beforeEach(() => {
    jest
      .spyOn(View.prototype, 'measureInWindow')
      .mockImplementation((callback) => {
        callback(0, 4000, 390, 320);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('heavy screen keeps every section mounted', async () => {
    await measureRenders(<AlwaysMountedPage />);
  });

  test('heavy screen leaves sections outside the viewport unmounted', async () => {
    await measureRenders(<LazyMountedPage />);
  });
});
