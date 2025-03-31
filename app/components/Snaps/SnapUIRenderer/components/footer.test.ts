import { ButtonElement, FooterElement } from '@metamask/snaps-sdk/jsx';
import { footer, DEFAULT_FOOTER } from './footer';
import { mockTheme } from '../../../../util/theme';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import { UIComponent } from './types';

describe('footer', () => {
  const mockT = (value: string) => `translated_${value}`;
  const mockOnCancel = jest.fn();

  const createButtonElement = (
    name?: string,
    text: string = 'Button',
  ): ButtonElement => ({
    key: 'mock-key',
    type: 'Button',
    props: {
      children: [text],
      ...(name ? { name } : {}),
    },
  });

  const createFooterElement = (
    children: ButtonElement[] = [],
  ): FooterElement => ({
    key: 'mock-key',
    type: 'Footer',
    props: {
      children:
        children.length === 2
          ? ([children[0], children[1]] as [ButtonElement, ButtonElement])
          : children[0] || createButtonElement(),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('return default footer structure with no buttons when no children and no onCancel', () => {
    const footerElement = createFooterElement([]);

    const result = footer({
      element: footerElement,
      t: mockT,
      map: {},
      theme: mockTheme,
    });

    expect(result.element).toBe(DEFAULT_FOOTER.element);

    const children = result.children as UIComponent[];
    expect(children).toBeTruthy();
    expect(Array.isArray(children)).toBe(true);

    const buttonComponent = children[0];
    expect(buttonComponent.element).toBe('SnapUIFooterButton');
    expect(buttonComponent.props).toMatchObject({
      disabled: undefined,
      form: undefined,
      isSnapAction: true,
      loading: false,
      name: undefined,
      onCancel: undefined,
      textVariant: 'sBodyMDMedium',
      type: undefined,
      variant: 'Primary',
    });

    const buttonChildren = buttonComponent.children as UIComponent[];
    expect(buttonChildren).toBeTruthy();
    expect(Array.isArray(buttonChildren)).toBe(true);

    const textComponent = buttonChildren[0];
    expect(textComponent.element).toBe('RNText');
    expect(textComponent.children).toBe('Button');
    expect(textComponent.props?.color).toBe('Info');
  });

  it('add cancel button when onCancel is provided and only one child', () => {
    const footerElement = createFooterElement([
      createButtonElement('confirm', 'Confirm'),
    ]);

    const result = footer({
      element: footerElement,
      t: mockT,
      onCancel: mockOnCancel,
      map: {},
      theme: mockTheme,
    });

    const children = result.children as UIComponent[];
    expect(children).toBeTruthy();
    expect(Array.isArray(children)).toBe(true);

    const cancelButton = children[0];
    expect(cancelButton.element).toBe('SnapUIFooterButton');
    expect(cancelButton.props).toMatchObject({
      isSnapAction: false,
      onCancel: mockOnCancel,
      variant: 'Secondary',
    });

    if (typeof cancelButton.children === 'string') {
      expect(cancelButton.children).toBe(
        'translated_template_confirmation.cancel',
      );
    } else {
      const buttonChildren = cancelButton.children as (string | UIComponent)[];

      if (Array.isArray(buttonChildren) && buttonChildren.length > 0) {
        const content = buttonChildren[0];

        if (typeof content === 'string') {
          expect(content).toBe('translated_template_confirmation.cancel');
        } else if (
          content &&
          typeof content === 'object' &&
          'children' in content
        ) {
          const textContent = content.children;
          if (typeof textContent === 'string') {
            expect(textContent).toBe('translated_template_confirmation.cancel');
          }
        }
      }
    }
  });

  it('handle multiple buttons with correct variants', () => {
    const footerElement = createFooterElement([
      createButtonElement('reject', 'Reject'),
      createButtonElement('confirm', 'Confirm'),
    ]);

    const result = footer({
      element: footerElement,
      t: mockT,
      map: {},
      theme: mockTheme,
    });

    const children = result.children as UIComponent[];
    expect(children).toBeTruthy();
    expect(Array.isArray(children)).toBe(true);
    expect(children.length).toBeGreaterThanOrEqual(2);

    const rejectButton = children[0];
    expect(rejectButton.props?.variant).toBe(ButtonVariants.Secondary);
    expect(rejectButton.props?.isSnapAction).toBe(true);

    const confirmButton = children[1];
    expect(confirmButton.props?.variant).toBe(ButtonVariants.Primary);
    expect(confirmButton.props?.isSnapAction).toBe(true);

    const rejectButtonChildren = rejectButton.children as (
      | string
      | UIComponent
    )[];
    if (
      Array.isArray(rejectButtonChildren) &&
      rejectButtonChildren.length > 0
    ) {
      const textContent = rejectButtonChildren[0];
      if (typeof textContent === 'object' && textContent.element === 'RNText') {
        const text = textContent.children;
        if (typeof text === 'string') {
          expect(text).toBe('Reject');
        }
      }
    }

    const confirmButtonChildren = confirmButton.children as (
      | string
      | UIComponent
    )[];
    if (
      Array.isArray(confirmButtonChildren) &&
      confirmButtonChildren.length > 0
    ) {
      const textContent = confirmButtonChildren[0];
      if (typeof textContent === 'object' && textContent.element === 'RNText') {
        const text = textContent.children;
        if (typeof text === 'string') {
          expect(text).toBe('Confirm');
        }
      }
    }
  });

  it('use index as key when button name is not provided', () => {
    const footerElement = createFooterElement([
      createButtonElement(undefined, 'Button'),
    ]);

    const result = footer({
      element: footerElement,
      t: mockT,
      map: {},
      theme: mockTheme,
    });

    const children = result.children as UIComponent[];
    expect(children).toBeTruthy();
    expect(Array.isArray(children)).toBe(true);

    const button = children[0];
    expect(button.key).toBe('snap-footer-button-0');
  });
});
