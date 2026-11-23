const visibleHandleCounts = new Map<string, number>();

/** Registers Chase handles that are currently rendered in the active Pro tab. */
export const registerVisibleChaseOrderHandles = (
  handles: readonly string[],
) => {
  const uniqueHandles = [...new Set(handles)];
  uniqueHandles.forEach((handle) => {
    visibleHandleCounts.set(handle, (visibleHandleCounts.get(handle) ?? 0) + 1);
  });
  return () => {
    uniqueHandles.forEach((handle) => {
      const nextCount = (visibleHandleCounts.get(handle) ?? 1) - 1;
      if (nextCount <= 0) {
        visibleHandleCounts.delete(handle);
      } else {
        visibleHandleCounts.set(handle, nextCount);
      }
    });
  };
};

export const isChaseOrderHandleVisible = (handle: string) =>
  visibleHandleCounts.has(handle);

export const resetChaseOrderVisibilityForTests = () => {
  visibleHandleCounts.clear();
};
