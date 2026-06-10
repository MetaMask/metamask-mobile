export interface HomeTabDeeplinkNavigationTarget {
  type: 'home-tab';
  routeName: string;
  params?: object;
}

export type DeeplinkNavigationTarget = HomeTabDeeplinkNavigationTarget;

export interface DeeplinkNavigationIntent {
  type: 'navigation';
  target: DeeplinkNavigationTarget;
  prepare?: () => void | Promise<void>;
}

export type DeeplinkIntent = DeeplinkNavigationIntent;

export const isHomeTabDeeplinkNavigationIntent = (
  intent: DeeplinkIntent | null | undefined,
): intent is DeeplinkNavigationIntent & {
  target: HomeTabDeeplinkNavigationTarget;
} => intent?.type === 'navigation' && intent.target.type === 'home-tab';
