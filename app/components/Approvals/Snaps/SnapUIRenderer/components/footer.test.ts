import { ButtonElement, FooterElement } from '@metamask/snaps-sdk/jsx';
import { footer, DEFAULT_FOOTER } from '../components/footer';
import { ButtonVariant } from '@metamask/snaps-sdk';
import * as snapsUtils from '@metamask/snaps-utils';

jest.mock('@metamask/snaps-utils', () => ({
  getJsxChildren: (element: any) => element.children,
}));

describe('footer', () => {
  const mockT = (value: string) => `translated_${value}`;
  const mockOnCancel = jest.fn();
  const mockButtonFn = jest.fn().mockImplementation(({ element }) => ({
    props: { name: element.props?.name },
    children: element.children,
  }));

  const createFooterElement = (
    children: ButtonElement[] = [],
  ): FooterElement => ({
    type: 'Footer',
    children,
    props: {},
  });

  const createButtonElement = (
    name?: string,
    text: string = 'Button',
  ): ButtonElement => ({
    type: 'Button',
    children: [text],
    props: name ? { name } : {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default footer structure with no buttons when no children and no onCancel', () => {
    const footerElement = createFooterElement();

    const result = footer({
      element: footerElement,
      t: mockT,
      buttonFn: mockButtonFn,
    });

    expect(result).toEqual({
      ...DEFAULT_FOOTER,
      children: [],
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
      buttonFn: mockButtonFn,
    });

    expect(result.children).toHaveLength(2);
    expect(result.children[0]).toEqual({
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
      buttonFn: mockButtonFn,
    });

    expect(result.children).toHaveLength(2);
    expect(result.children[0].props.variant).toBe(ButtonVariant.Secondary);
    expect(result.children[1].props.variant).toBe(ButtonVariant.Primary);
    expect(result.children[0].props.isSnapAction).toBe(true);
    expect(result.children[1].props.isSnapAction).toBe(true);
  });

  it('should use index as key when button name is not provided', () => {
    const footerElement = createFooterElement([
      createButtonElement(undefined, 'Button'),
    ]);

    const result = footer({
      element: footerElement,
      t: mockT,
      buttonFn: mockButtonFn,
    });

    expect(result.children[0].key).toBe('snap-footer-button-0');
  });
});
