import type { WithWidgetTheme } from './types';

/**
 * Android counterpart of createMetaMaskLiveActivity.ios.ts — see that file
 * and createMetaMaskWidget.android.ts for why this no-op stub exists.
 * Live Activities are an iOS-only OS feature (Dynamic Island / Lock Screen),
 * so there is no meaningful Android behavior to provide here.
 */
interface NoopEventSubscription {
  remove(): void;
}

export interface NoopLiveActivity<TProps extends object> {
  update(_props: TProps): Promise<void>;
  end(
    _dismissalPolicy?: unknown,
    _props?: TProps,
    _contentDate?: Date,
  ): Promise<void>;
  getPushToken(): Promise<string | null>;
  addPushTokenListener(
    _listener: (event: unknown) => void,
  ): NoopEventSubscription;
}

export interface NoopLiveActivityFactory<TProps extends object> {
  start(_props: TProps, _url?: string): NoopLiveActivity<TProps>;
  getInstances(): NoopLiveActivity<TProps>[];
}

function createNoopLiveActivity<
  TProps extends object,
>(): NoopLiveActivity<TProps> {
  return {
    update: async () => undefined,
    end: async () => undefined,
    getPushToken: async () => null,
    addPushTokenListener: () => ({ remove: () => undefined }),
  };
}

export function createMetaMaskLiveActivity<TProps extends object = object>(
  _name: string,
  _liveActivity: (
    props: TProps & WithWidgetTheme,
    environment: unknown,
  ) => unknown,
): NoopLiveActivityFactory<TProps & WithWidgetTheme> {
  return {
    start: () => createNoopLiveActivity<TProps & WithWidgetTheme>(),
    getInstances: () => [],
  };
}
