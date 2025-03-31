import {
  ButtonElement,
  ButtonProps,
  JSXElement,
} from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapTextToTemplate } from '../utils';
import { UIComponent, UIComponentFactory } from './types';
import {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { Theme } from '../../../../util/theme/models';

interface ButtonElementProps extends ButtonElement {
  props: ButtonProps & {
    loading?: boolean;
    size?: 'sm' | 'md';
  };
}

const COLORS = {
  primary: TextColor.Info,
  destructive: TextColor.Error,
  disabled: TextColor.Muted,
};

// Map TextColor enum to actual theme colors
const getThemeColor = (textColor: TextColor, theme: Theme) => {
  switch (textColor) {
    case TextColor.Info:
      return theme.colors.primary.default;
    case TextColor.Error:
      return theme.colors.error.default;
    case TextColor.Muted:
      return theme.colors.text.muted;
    default:
      return theme.colors.text.default;
  }
};

// Process children to handle TemplateRenderer component with proper theme colors
function processButtonChildren(
  children: NonEmptyArray<UIComponent | string>,
  variant: string = 'primary',
  disabled: boolean = false,
  theme: Theme,
): NonEmptyArray<UIComponent | string> {
  const overriddenVariant = disabled ? 'disabled' : variant;
  const textColor =
    COLORS[overriddenVariant as keyof typeof COLORS] || TextColor.Info;
  const themeColor = getThemeColor(textColor, theme);

  return children.map((child) => {
    if (typeof child === 'string') {
      return child;
    }

    // Handle TemplateRenderer components with sections
    if (child.element === 'TemplateRenderer') {
      if (
        child.props &&
        'sections' in child.props &&
        Array.isArray(child.props.sections)
      ) {
        const sections = child.props.sections;
        const modifiedSections = sections.map((section: any) => {
          if (section.element === 'RNText') {
            // Use a direct approach to minimize type issues
            return {
              ...section,
              props: {
                ...section.props,
                color: textColor, // Use the enum value which Text component expects
              },
            };
          }
          return section;
        });

        return {
          ...child,
          props: {
            ...child.props,
            sections: modifiedSections,
          },
        };
      }

      // Handle TemplateRenderer with nested children (but no sections)
      if (child.children && Array.isArray(child.children)) {
        return {
          ...child,
          children: processButtonChildren(
            child.children as NonEmptyArray<UIComponent | string>,
            variant,
            disabled,
            theme,
          ),
        };
      }
    }

    // If the element is a Text/RNText component, apply color directly
    if (child.element === 'Text' || child.element === 'RNText') {
      return {
        ...child,
        props: {
          ...child.props,
          color: textColor, // Use the enum value which Text component expects
        },
      };
    }

    // Handle any other component with children recursively
    if (child.children && Array.isArray(child.children)) {
      return {
        ...child,
        children: processButtonChildren(
          child.children as NonEmptyArray<UIComponent | string>,
          variant,
          disabled,
          theme,
        ),
      };
    }

    return child;
  }) as NonEmptyArray<UIComponent | string>;
}

export const button: UIComponentFactory<ButtonElementProps> = (params) => {
  const { element: e, theme } = params;

  // The theme should already be available in params
  const mappedChildren = mapTextToTemplate(
    getJsxChildren(e) as NonEmptyArray<string | JSXElement>,
    params,
  );

  const processedChildren = processButtonChildren(
    mappedChildren,
    e.props.variant,
    e.props.disabled,
    theme,
  );

  return {
    element: 'SnapUIButton',
    props: {
      type: e.props.type,
      // This differs from the extension implementation because we don't have proper form support on RN
      form: e.props.form ?? params.form,
      variant: e.props.variant,
      name: e.props.name,
      disabled: e.props.disabled,
      loading: e.props.loading ?? false,
      textVariant:
        e.props.size === 'sm'
          ? TextVariant.BodySMMedium
          : TextVariant.BodyMDMedium,
    },
    children: processedChildren,
  };
};
