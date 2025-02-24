import {
  FieldElement,
  InputElement,
  JSXElement,
  CheckboxElement,
} from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { getPrimaryChildElementIndex, mapToTemplate } from '../utils';
import { checkbox as checkboxFn } from './checkbox';
import { UIComponentFactory, UIComponentParams } from './types';

export const field: UIComponentFactory<FieldElement> = ({
  element: e,
  form,
  ...params
}) => {
  // For fields we don't render the Input itself, we just adapt SnapUIInput.
  const children = getJsxChildren(e);
  const primaryChildIndex = getPrimaryChildElementIndex(
    children as JSXElement[],
  );
  const child = children[primaryChildIndex] as JSXElement;

  switch (child.type) {
    case 'Input': {
      const getLeftAccessory = () =>
        mapToTemplate({
          ...params,
          element: children[0] as JSXElement,
        });

      const getRightAccessory = (accessoryIndex: number) =>
        mapToTemplate({
          ...params,
          element: children[accessoryIndex] as JSXElement,
        });

      const input = child as InputElement;

      const leftAccessoryMapped =
        primaryChildIndex > 0 ? getLeftAccessory() : undefined;

      let rightAccessoryIndex: number | undefined;
      if (children[2]) {
        rightAccessoryIndex = 2;
      } else if (primaryChildIndex === 0 && children[1]) {
        rightAccessoryIndex = 1;
      }
      const rightAccessoryMapped = rightAccessoryIndex
        ? getRightAccessory(rightAccessoryIndex)
        : undefined;

      return {
        element: 'SnapUIInput',
        props: {
          id: input.props.name,
          placeholder: input.props.placeholder,
          label: e.props.label,
          name: input.props.name,
          form,
          error: e.props.error !== undefined,
          helpText: e.props.error,
          disabled: child.props.disabled,
        },
        propComponents: {
          startAccessory: leftAccessoryMapped && {
            ...leftAccessoryMapped,
            props: {
              ...leftAccessoryMapped.props,
              padding: 0,
            },
          },
          endAccessory: rightAccessoryMapped && {
            ...rightAccessoryMapped,
            props: {
              ...rightAccessoryMapped.props,
              padding: 0,
            },
          },
        },
      };
    }

    case 'Checkbox': {
      const checkbox = child as CheckboxElement;
      const checkboxMapped = checkboxFn({
        element: checkbox,
      } as UIComponentParams<CheckboxElement>);
      return {
        element: 'SnapUICheckbox',
        props: {
          ...checkboxMapped.props,
          fieldLabel: e.props.label,
          form,
          error: e.props.error,
          disabled: child.props.disabled,
        },
      };
    }

    default:
      throw new Error(`Invalid Field child: ${child.type}`);
  }
};
