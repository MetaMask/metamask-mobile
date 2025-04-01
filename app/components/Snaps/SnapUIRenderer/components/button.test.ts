import { ButtonType } from '@metamask/snaps-sdk';
import { button } from './button';
import { mockTheme } from '../../../../util/theme';
import {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { UIComponent } from './types';

type TestButtonElement = {
  type: string;
  props: {
    variant: string;
    disabled: boolean;
    loading: boolean;
    children?: (string | MockUIComponent)[];
    [key: string]: unknown;
  };
  key: string;
  children: (string | MockUIComponent)[];
};

interface MockUIComponent {
  element: string;
  props?: Record<string, unknown>;
  children?: (string | MockUIComponent)[];
}

jest.mock('@metamask/snaps-utils', () => ({
  getJsxChildren: jest.fn((elem) => elem.children || []),
}));

jest.mock('../utils', () => ({
  mapTextToTemplate: jest.fn((children) =>
    children.map((child: string | MockUIComponent) => {
      if (typeof child === 'string') {
        return child;
      }
      return {
        element: child.element || 'Text',
        props: child.props || {},
        children: child.children || [],
      };
    }),
  ),
}));

describe('button component factory', () => {
  const mockT = (key: string) => key;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createButtonElement = (
    props: Record<string, unknown> = {},
    children: (string | MockUIComponent)[] = ['Button Text'],
  ): TestButtonElement => ({
    type: 'Button',
    props: {
      variant: 'primary',
      disabled: false,
      loading: false,
      children,
      ...props,
    },
    key: 'test-key',
    children,
  });

  it('creates a basic button with text children', () => {
    const buttonElement = createButtonElement();

    const result = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: buttonElement as any,
      theme: mockTheme,
      form: undefined,
      map: {},
      t: mockT,
    });

    expect(result.element).toBe('SnapUIButton');
    expect(result.props?.variant).toBe('primary');
    expect(result.props?.disabled).toBe(false);
    expect(result.props?.loading).toBe(false);

    const children = result.children as UIComponent[];
    expect(children).toHaveLength(1);

    const textChild = children[0] as UIComponent;
    expect(textChild.element).toBe('Text');
    expect(textChild.props?.color).toBe(TextColor.Info);

    const styleObj = textChild.props?.style as Record<string, unknown>;
    expect(styleObj?.color).toBe(mockTheme.colors.primary.default);
  });

  it('sets button props correctly based on input', () => {
    const buttonElement = createButtonElement({
      variant: 'destructive',
      disabled: true,
      loading: true,
      name: 'test-button',
      type: ButtonType.Submit,
      form: 'test-form',
    });

    const result = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: buttonElement as any,
      theme: mockTheme,
      form: 'parent-form',
      map: {},
      t: mockT,
    });

    expect(result.props?.variant).toBe('destructive');
    expect(result.props?.disabled).toBe(true);
    expect(result.props?.loading).toBe(true);
    expect(result.props?.name).toBe('test-button');
    expect(result.props?.type).toBe(ButtonType.Submit);
    expect(result.props?.form).toBe('test-form');
  });

  it('uses parent form when button form is not provided', () => {
    const buttonElement = createButtonElement();

    const result = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: buttonElement as any,
      theme: mockTheme,
      form: 'parent-form',
      map: {},
      t: mockT,
    });

    expect(result.props?.form).toBe('parent-form');
  });

  it('handles size property and sets text variant correctly', () => {
    const smallButtonElement = createButtonElement({ size: 'sm' });
    const mediumButtonElement = createButtonElement({ size: 'md' });

    const smallResult = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: smallButtonElement as any,
      theme: mockTheme,
      form: undefined,
      map: {},
      t: mockT,
    });

    const mediumResult = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: mediumButtonElement as any,
      theme: mockTheme,
      form: undefined,
      map: {},
      t: mockT,
    });

    expect(smallResult.props?.textVariant).toBe(TextVariant.BodySMMedium);
    expect(mediumResult.props?.textVariant).toBe(TextVariant.BodyMDMedium);
  });

  it('applies disabled styling correctly', () => {
    const buttonElement = createButtonElement({ disabled: true });

    const result = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: buttonElement as any,
      theme: mockTheme,
      form: undefined,
      map: {},
      t: mockT,
    });

    const textChild = (result.children as UIComponent[])[0] as UIComponent;
    expect(textChild.props?.color).toBe(TextColor.Muted);

    const styleObj = textChild.props?.style as Record<string, unknown>;
    expect(styleObj?.color).toBe(mockTheme.colors.text.muted);
  });

  it('applies destructive variant styling correctly', () => {
    const buttonElement = createButtonElement({ variant: 'destructive' });

    const result = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: buttonElement as any,
      theme: mockTheme,
      form: undefined,
      map: {},
      t: mockT,
    });

    const textChild = (result.children as UIComponent[])[0] as UIComponent;
    expect(textChild.props?.color).toBe(TextColor.Error);

    const styleObj = textChild.props?.style as Record<string, unknown>;
    expect(styleObj?.color).toBe(mockTheme.colors.error.default);
  });

  it('styles complex children recursively', () => {
    const nestedTextComponent: MockUIComponent = {
      element: 'Text',
      props: {},
      children: ['Nested Text'],
    };

    const complexTextComponent: MockUIComponent = {
      element: 'Text',
      props: {},
      children: ['Parent Text', nestedTextComponent],
    };

    const buttonElement = createButtonElement({}, [complexTextComponent]);

    const result = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: buttonElement as any,
      theme: mockTheme,
      form: undefined,
      map: {},
      t: mockT,
    });

    const parent = (result.children as UIComponent[])[0] as UIComponent;
    expect(parent.element).toBe('Text');
    expect(parent.props?.color).toBe(TextColor.Info);

    const styleObj = parent.props?.style as Record<string, unknown>;
    expect(styleObj?.color).toBe(mockTheme.colors.primary.default);
  });

  it('styles components with sections correctly', () => {
    const sectionContainer: MockUIComponent = {
      element: 'SectionContainer',
      props: {
        sections: [
          {
            element: 'RNText',
            props: {},
          },
          {
            element: 'SnapUIIcon',
            props: {
              name: 'test-icon',
              size: 24,
            },
          },
        ],
      },
    };

    const buttonElement = createButtonElement({}, [sectionContainer]);

    const result = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: buttonElement as any,
      theme: mockTheme,
      form: undefined,
      map: {},
      t: mockT,
    });

    const container = (result.children as UIComponent[])[0] as UIComponent;
    expect(container.element).toBe('SectionContainer');

    const sections = container.props?.sections as {
      element: string;
      props: Record<string, unknown>;
    }[];
    expect(sections).toHaveLength(2);

    const textSection = sections[0];
    expect(textSection.element).toBe('RNText');
    const textSectionStyle = textSection.props.style as Record<string, unknown>;
    expect(textSectionStyle.color).toBe(mockTheme.colors.primary.default);

    const iconSection = sections[1];
    expect(iconSection.element).toBe('SnapUIIcon');
    expect(iconSection.props.color).toBe(mockTheme.colors.primary.default);
  });

  it('handles icon components correctly', () => {
    const iconComponent: MockUIComponent = {
      element: 'SnapUIIcon',
      props: {
        name: 'test-icon',
        size: 24,
      },
    };

    const buttonElement = createButtonElement({}, [iconComponent]);

    const result = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: buttonElement as any,
      theme: mockTheme,
      form: undefined,
      map: {},
      t: mockT,
    });

    const icon = (result.children as UIComponent[])[0] as UIComponent;
    expect(icon.element).toBe('SnapUIIcon');
    expect(icon.props?.color).toBe(mockTheme.colors.primary.default);
  });

  it('handles mixed text and icon children', () => {
    const iconComponent: MockUIComponent = {
      element: 'SnapUIIcon',
      props: {
        name: 'test-icon',
        size: 24,
      },
    };

    const buttonElement = createButtonElement({}, [
      'Text Content',
      iconComponent,
    ]);

    const result = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: buttonElement as any,
      theme: mockTheme,
      form: undefined,
      map: {},
      t: mockT,
    });

    const children = result.children as UIComponent[];
    expect(children).toHaveLength(2);

    const textChild = children[0] as UIComponent;
    expect(textChild.element).toBe('Text');
    expect(textChild.props?.color).toBe(TextColor.Info);

    const iconChild = children[1] as UIComponent;
    expect(iconChild.element).toBe('SnapUIIcon');
    expect(iconChild.props?.color).toBe(mockTheme.colors.primary.default);
  });

  it('applies the same color to both text and icons', () => {
    const textComponent: MockUIComponent = {
      element: 'Text',
      props: {},
      children: ['Text'],
    };

    const iconComponent: MockUIComponent = {
      element: 'SnapUIIcon',
      props: {
        name: 'test-icon',
        size: 24,
      },
    };

    const buttonElement = createButtonElement({}, [
      textComponent,
      iconComponent,
    ]);

    const result = button({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: buttonElement as any,
      theme: mockTheme,
      form: undefined,
      map: {},
      t: mockT,
    });

    const children = result.children as UIComponent[];
    expect(children).toHaveLength(2);

    const textChild = children[0] as UIComponent;
    const iconChild = children[1] as UIComponent;

    const textStyle = textChild.props?.style as Record<string, unknown>;
    expect(textStyle?.color).toBe(mockTheme.colors.primary.default);
    expect(iconChild.props?.color).toBe(mockTheme.colors.primary.default);
  });
});
