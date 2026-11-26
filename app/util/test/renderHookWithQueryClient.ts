import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  renderHook,
  type RenderHookOptions,
} from '@testing-library/react-native';

const clients: QueryClient[] = [];

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

/** Render a hook with its own query cache. */
export function renderHookWithQueryClient<Result, Props>(
  hook: (props: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'>,
) {
  const client = new QueryClient();
  clients.push(client);
  return renderHook(hook, {
    ...options,
    wrapper: ({ children }: React.PropsWithChildren) =>
      React.createElement(QueryClientProvider, { client }, children),
  });
}
