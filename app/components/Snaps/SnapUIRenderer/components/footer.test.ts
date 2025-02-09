import { ButtonElement, FooterElement } from '@metamask/snaps-sdk/jsx';
import { footer, DEFAULT_FOOTER } from './footer';
import { ButtonVariant } from '@metamask/snaps-sdk';

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

  it('should return default footer structure with no buttons when no children and no onCancel', () => {
    const footerElement = createFooterElement([]);

    const result = footer({
      element: footerElement,
      t: mockT,
      map: {},
    });

    expect(result).toEqual({
      ...DEFAULT_FOOTER,
      children: [
        {
          element: 'SnapUIFooterButton',
          key: 'snap-footer-button-0',
          props: {
            disabled: undefined,
            form: undefined,
            isSnapAction: true,
            label: ['Button'],
            loading: false,
            name: undefined,
            onCancel: undefined,
            onConfirm: undefined,
            textVariant: 'sBodyMD',
            type: 'Button',
            variant: 'primary',
          },
          children: ['Button'],
        },
      ],
    });
  });

  it('should add cancel button when onCancel is provided and only one child', () => {
    const footerElement = createFooterElement([
      createButtonElement('confirm', 'Confirm'),
    ]);

    const result = footer({
      element: footerElement,
      t: mockT,
      onCancel: mockOnCancel,
      map: {},
    });

    expect(Array.isArray(result.children)).toBe(true);
    expect((result.children as any[])[0]).toEqual({
      element: 'BottomSheetFooter',
      key: 'default-button',
      props: {
        isSnapAction: false,
        label: 'translated_template_confirmation.cancel',
        onCancel: mockOnCancel,
        variant: 'secondary',
      },
    });
  });

  it('should handle multiple buttons with correct variants', () => {
    const footerElement = createFooterElement([
      createButtonElement('reject', 'Reject'),
      createButtonElement('confirm', 'Confirm'),
    ]);

    const result = footer({
      element: footerElement,
      t: mockT,
      map: {},
    });

    expect(Array.isArray(result.children)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.children as any[])[0].props.variant).toBe(
      ButtonVariant.Secondary,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.children as any[])[1].props.variant).toBe(
      ButtonVariant.Primary,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.children as any[])[0].props.isSnapAction).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.children as any[])[1].props.isSnapAction).toBe(true);
  });

  it('should use index as key when button name is not provided', () => {
    const footerElement = createFooterElement([
      createButtonElement(undefined, 'Button'),
    ]);

    const result = footer({
      element: footerElement,
      t: mockT,
      map: {},
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.children as any[])[0].key).toBe('snap-footer-button-0');
  });
});
