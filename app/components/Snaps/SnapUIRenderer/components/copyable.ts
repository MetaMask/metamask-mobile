import { CopyableElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const copyable: UIComponentFactory<CopyableElement> = ({
  element: e,
}) => ({
  element: 'SnapUICopyable',
  props: {
    text: e.props.value,
    sensitive: e.props.sensitive,
  },
});
