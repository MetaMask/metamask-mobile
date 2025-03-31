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
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { Theme } from '@metamask/design-tokens';
import { StyleProp, TextStyle } from 'react-native';

interface ButtonElementProps extends ButtonElement {
  props: ButtonProps & {
    loading?: boolean;
    size?: 'sm' | 'md';
  };
}
interface CommonProps {
  style?: StyleProp<TextStyle>;
  color?: TextColor | string;
  variant?: TextVariant;
  [key: string]: unknown;
}

interface TextComponentProps extends CommonProps {
  color?: TextColor;
  variant: TextVariant;
}

interface IconComponentProps extends CommonProps {
  color?: string;
  name: string;
  size: string | number;
}

// Section component types
interface SectionComponent {
  element: string;
  props: CommonProps;
}

interface TextSectionComponent extends SectionComponent {
  element: 'RNText' | 'Text';
  props: TextComponentProps;
}

interface IconSectionComponent extends SectionComponent {
  element: 'SnapUIIcon';
  props: IconComponentProps;
}

type ProcessedSectionComponent =
  | TextSectionComponent
  | IconSectionComponent
  | SectionComponent;

interface ComponentWithSections extends UIComponent {
  props: {
    sections: ProcessedSectionComponent[];
    [key: string]: unknown;
  };
}

const COLORS = {
  primary: TextColor.Info,
  destructive: TextColor.Error,
  disabled: TextColor.Muted,
};

/**
 * Applies styling to button content elements based on the button variant
 */
function processButtonContent(
  content: NonEmptyArray<UIComponent | string>,
  variant: string,
  disabled: boolean,
  textVariant: TextVariant,
  theme: Theme,
): NonEmptyArray<UIComponent> {
  const overriddenVariant = disabled ? 'disabled' : variant;
  const enumColor = COLORS[overriddenVariant as keyof typeof COLORS];

  const themeColor =
    enumColor === TextColor.Info
      ? theme.colors.primary.default
      : enumColor === TextColor.Error
      ? theme.colors.error.default
      : theme.colors.text.muted;

  /**
   * Apply styles to a component based on its type
   */
  function styleComponent(component: UIComponent): UIComponent {
    const result: UIComponent = {
      ...component,
    };

    if (component.element === 'Text' || component.element === 'RNText') {
      result.props = {
        ...component.props,
        color: enumColor,
        style: {
          ...((component.props?.style as Record<string, unknown>) || {}),
          color: themeColor,
        },
      };
    } else if (component.element === 'SnapUIIcon') {
      result.props = {
        ...component.props,
        color: themeColor,
      };
    }

    if (component.children && Array.isArray(component.children)) {
      result.children = component.children
        .map((child) => {
          if (typeof child === 'string') return child;
          if (!child || typeof child !== 'object') return null;
          return styleComponent(child as UIComponent);
        })
        .filter(Boolean) as NonEmptyArray<string | UIComponent>;
    }

    return result;
  }

  return content.map((child) => {
    if (typeof child === 'string') {
      return {
        element: 'Text',
        props: {
          color: enumColor,
          variant: textVariant,
          style: { color: themeColor },
        },
        children: [child],
      };
    }

    if (child.props && 'sections' in child.props) {
      const componentWithSections = child as ComponentWithSections;
      const modifiedSections = componentWithSections.props.sections.map(
        (section) => {
          const result = { ...section };

          if (section.element === 'RNText') {
            result.props = {
              ...section.props,
              style: {
                ...((section.props.style as Record<string, unknown>) || {}),
                color: themeColor,
              },
            };
          } else if (section.element === 'SnapUIIcon') {
            result.props = {
              ...section.props,
              color: themeColor,
            };
          }

          return result;
        },
      );

      return {
        ...componentWithSections,
        props: {
          ...componentWithSections.props,
          sections: modifiedSections,
        },
      };
    }

    return styleComponent(child);
  }) as NonEmptyArray<UIComponent>;
}

export const button: UIComponentFactory<ButtonElementProps> = ({
  element: e,
  theme,
  ...params
}) => {
  const textVariant =
    e.props.size === 'sm' ? TextVariant.BodySMMedium : TextVariant.BodyMDMedium;

  const mappedChildren = mapTextToTemplate(
    getJsxChildren(e) as NonEmptyArray<string | JSXElement>,
    {
      ...params,
      theme,
    },
  );

  const processedChildren = processButtonContent(
    mappedChildren,
    e.props.variant || 'primary',
    !!e.props.disabled,
    textVariant,
    theme,
  );

  return {
    element: 'SnapUIButton',
    props: {
      type: e.props.type,
      form: e.props.form ?? params.form,
      variant: e.props.variant || 'primary',
      name: e.props.name,
      disabled: e.props.disabled,
      loading: e.props.loading ?? false,
      textVariant,
    },
    children: processedChildren,
  };
};
