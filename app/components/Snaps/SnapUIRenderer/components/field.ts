import {
  FieldElement,
  InputElement,
  JSXElement,
  CheckboxElement,
  SelectorElement,
  AddressInputElement,
  AssetSelectorElement,
  AccountSelectorElement,
  DropdownElement,
  RadioGroupElement,
  DateTimePickerElement,
} from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { getPrimaryChildElementIndex, mapToTemplate } from '../utils';
import { checkbox as checkboxFn } from './checkbox';
import { selector as selectorFn } from './selector';
import { UIComponentFactory, UIComponentParams } from './types';
import { constructInputProps } from './input';
import { assetSelector as assetSelectorFn } from './asset-selector';
import { accountSelector as accountSelectorFn } from './account-selector';
import { dropdown as dropdownFn } from './dropdown';
import { radioGroup as radioGroupFn } from './radioGroup';
import { dateTimePicker as dateTimePickerFn } from './date-time-picker';

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

  switch (child?.type) {
    case 'AddressInput': {
      const addressInput = child as AddressInputElement;
      return {
        element: 'SnapUIAddressInput',
        props: {
          name: addressInput.props.name,
          form,
          chainId: addressInput.props.chainId,
          displayAvatar: addressInput.props.displayAvatar,
          disabled: addressInput.props.disabled,
          placeholder: addressInput.props.placeholder,
          label: e.props.label,
          error: e.props.error,
          style,
        },
      };
    }

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
              style: {
                padding: 0,
                height: '100%',
                justifyContent: 'center',
              },
            },
          },
          endAccessory: rightAccessoryMapped && {
            ...rightAccessoryMapped,
            props: {
              ...rightAccessoryMapped.props,
              style: {
                padding: 0,
                height: '100%',
                justifyContent: 'center',
              },
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

    case 'AssetSelector': {
      const assetSelector = child as AssetSelectorElement;
      const assetSelectorMapped = assetSelectorFn({
        ...params,
        element: assetSelector,
      } as UIComponentParams<AssetSelectorElement>);

      return {
        ...assetSelectorMapped,
        element: 'SnapUIAssetSelector',
        props: {
          ...assetSelectorMapped.props,
          label: e.props.label,
          form,
          error: e.props.error,
          compact: params.isParentFlexRow,
          style,
        },
      };
    }

    case 'AccountSelector': {
      const accountSelector = child as AccountSelectorElement;
      const accountSelectorMapped = accountSelectorFn({
        ...params,
        element: accountSelector,
      } as UIComponentParams<AccountSelectorElement>);

      return {
        ...accountSelectorMapped,
        element: 'SnapUIAccountSelector',
        props: {
          ...accountSelectorMapped.props,
          label: e.props.label,
          form,
          error: e.props.error,
        },
      };
    }

    case 'Dropdown': {
      const dropdown = child as DropdownElement;
      const dropdownMapped = dropdownFn({
        element: dropdown,
      } as UIComponentParams<DropdownElement>);
      return {
        element: 'SnapUIDropdown',
        props: {
          ...dropdownMapped.props,
          id: dropdown.props.name,
          label: e.props.label,
          name: dropdown.props.name,
          form,
          error: e.props.error,
          disabled: child.props.disabled,
        },
      };
    }

    case 'RadioGroup': {
      const radioGroup = child as RadioGroupElement;
      const radioGroupMapped = radioGroupFn({
        element: radioGroup,
      } as UIComponentParams<RadioGroupElement>);
      return {
        element: 'SnapUIRadioGroup',
        props: {
          ...radioGroupMapped.props,
          id: radioGroup.props.name,
          label: e.props.label,
          name: radioGroup.props.name,
          form,
          error: e.props.error,
          disabled: child.props.disabled,
        },
      };
    }

    case 'DateTimePicker': {
      const dateTimePicker = child as DateTimePickerElement;
      const dateTimePickerMapped = dateTimePickerFn({
        element: dateTimePicker,
      } as UIComponentParams<DateTimePickerElement>);
      return {
        ...dateTimePickerMapped,
        element: 'SnapUIDateTimePicker',
        props: {
          ...dateTimePickerMapped.props,
          label: e.props.label,
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
