import { InputElement } from '@metamask/snaps-sdk/jsx';

import { UIComponentFactory } from './types';

export const input: UIComponentFactory<InputElement> = ({ element, form }) => ({
  element: 'SnapUIInput',
  props: {
    id: element.props.name,
    placeholder: element.props.placeholder,
    name: element.props.name,
    form,
  },
});
