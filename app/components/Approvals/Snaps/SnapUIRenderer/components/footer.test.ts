import { ButtonElement, FooterElement } from '@metamask/snaps-sdk/jsx';
import { footer, DEFAULT_FOOTER } from '../components/footer';
import { ButtonVariant } from '@metamask/snaps-sdk';

jest.mock('@metamask/snaps-utils', () => ({
  getJsxChildren: (element: any) => {
    const children = element.props.children;
    return Array.isArray(children) ? children : [children].filter(Boolean);
  },
}));

describe('footer', () => {
  const mockT = (value: string) => `translated_${value}`;
  const mockOnCancel = jest.fn();

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
            children: ['Button'],
            isSnapAction: true,
            variant: 'primary',
          },
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
      element: 'SnapUIFooterButton',
      key: 'default-button',
      props: {
        onCancel: mockOnCancel,
        variant: ButtonVariant.Secondary,
        isSnapAction: false,
      },
      children: 'translated_cancel',
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
    expect((result.children as any[])[0].props.variant).toBe(
      ButtonVariant.Secondary,
    );
    expect((result.children as any[])[1].props.variant).toBe(
      ButtonVariant.Primary,
    );
    expect((result.children as any[])[0].props.isSnapAction).toBe(true);
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

    expect((result.children as any[])[0].key).toBe('snap-footer-button-0');
  });
});
