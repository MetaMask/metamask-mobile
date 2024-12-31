import { InputElement } from '@metamask/snaps-sdk/jsx';

import { UIComponentFactory } from './types';

export const input: UIComponentFactory<InputElement> = ({
  element: e,
  form,
}) => ({
  element: 'SnapUIInput',
  props: {
    id: e.props.name,
    placeholder: e.props.placeholder,
    name: e.props.name,
    form,
  },
});
