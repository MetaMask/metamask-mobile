import { DateTimePickerElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const dateTimePicker: UIComponentFactory<DateTimePickerElement> = ({
  element: e,
  form,
}) => ({
  element: 'SnapUIDateTimePicker',
  props: {
    form,
    type: e.props.type,
    name: e.props.name,
    placeholder: e.props.placeholder,
    disabled: e.props.disabled,
    disablePast: e.props.disablePast,
    disableFuture: e.props.disableFuture,
  },
});
