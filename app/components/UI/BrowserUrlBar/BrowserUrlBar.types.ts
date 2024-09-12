export interface BrowserUrlBarProps {
  url: string;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route: any;
  onPress: () => void;
}
