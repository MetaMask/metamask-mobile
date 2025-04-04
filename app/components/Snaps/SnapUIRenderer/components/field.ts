import {
  FieldElement,
  InputElement,
  JSXElement,
  CheckboxElement,
  SelectorElement,
} from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { getPrimaryChildElementIndex, mapToTemplate } from '../utils';
import { checkbox as checkboxFn } from './checkbox';
import { selector as selectorFn } from './selector';
import { UIComponentFactory, UIComponentParams } from './types';
import { constructInputProps } from './input';

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

  // Fields have special styling that let's developers place two of them next to each other taking up 50% space.
  const style = {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '50%',
  };

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
          ...constructInputProps(input.props),
          id: input.props.name,
          placeholder: input.props.placeholder,
          label: e.props.label,
          name: input.props.name,
          form,
          error: e.props.error,
          disabled: child.props.disabled,
          style,
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
          style,
        },
      };
    }

    case 'Selector': {
      const selector = child as SelectorElement;
      const selectorMapped = selectorFn({
        ...params,
        element: selector,
      } as UIComponentParams<SelectorElement>);
      return {
        ...selectorMapped,
        element: 'SnapUISelector',
        props: {
          ...selectorMapped.props,
          label: e.props.label,
          form,
          error: e.props.error,
          disabled: child.props.disabled,
          style,
        },
      };
    }

    default:
      throw new Error(`Invalid Field child: ${child.type}`);
  }
};
