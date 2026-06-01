export function getSessionIdFromAnnotations(
  annotations?: { type: string; description?: string }[],
): string | null {
  return annotations?.find((a) => a.type === 'sessionId')?.description ?? null;
}
