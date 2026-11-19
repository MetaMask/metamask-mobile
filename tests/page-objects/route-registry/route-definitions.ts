export interface RouteDefinition {
  value: string;
  keyPath: string;
}

export function flattenRouteDefinitions(
  routes: Record<string, unknown>,
  parentPath = '',
): RouteDefinition[] {
  const definitions: RouteDefinition[] = [];

  for (const [key, value] of Object.entries(routes)) {
    const keyPath = parentPath ? `${parentPath}.${key}` : key;

    if (typeof value === 'string') {
      definitions.push({ value, keyPath });
      continue;
    }

    if (value && typeof value === 'object') {
      definitions.push(
        ...flattenRouteDefinitions(value as Record<string, unknown>, keyPath),
      );
    }
  }

  return definitions;
}
