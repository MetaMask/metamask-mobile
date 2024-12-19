import {
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
} from 'react-native';

export interface BrowserUrlBarProps {
  // url: string;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // route: any;
  isSecureConnection: boolean;
  onSubmitEditing: (text: string) => void;
  onPress: () => void;
  onCancel: () => void;
}
