import { ButtonVariants } from '../Buttons/Button/Button.types';
import { IconName } from '../Icons/Icon';
import {
  hasToastDescription,
  hasTrailingTextButton,
  shouldTopAlignToastContent,
} from './Toast.layout';
import { ButtonIconVariant, ToastVariants } from './Toast.types';

describe('Toast.layout', () => {
  it.each([
    ['undefined options', undefined, false],
    [
      'descriptionOptions',
      {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'Title' }],
        descriptionOptions: { description: 'Body' },
        hasNoTimeout: true,
      },
      true,
    ],
    [
      'newline-separated labels',
      {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'Title' }, { label: '\n' }, { label: 'Body' }],
        hasNoTimeout: true,
      },
      true,
    ],
    [
      'labels without description',
      {
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'Title only' }],
        hasNoTimeout: true,
      },
      false,
    ],
  ] as const)('hasToastDescription: %s', (_label, options, expected) => {
    expect(hasToastDescription(options)).toBe(expected);
  });

  it.each([
    [
      'trailing text button',
      {
        titleLineCount: 1,
        hasDescription: true,
        descriptionLineCount: 1,
        hasActionButton: false,
        hasTrailingTextButton: true,
      },
      false,
    ],
    [
      'multi-line title and description',
      {
        titleLineCount: 2,
        hasDescription: true,
        descriptionLineCount: 1,
        hasActionButton: false,
        hasTrailingTextButton: false,
      },
      true,
    ],
    [
      'action button with single-line description',
      {
        titleLineCount: 1,
        hasDescription: true,
        descriptionLineCount: 1,
        hasActionButton: true,
        hasTrailingTextButton: false,
      },
      true,
    ],
    [
      'multi-line description',
      {
        titleLineCount: 1,
        hasDescription: true,
        descriptionLineCount: 2,
        hasActionButton: false,
        hasTrailingTextButton: false,
      },
      true,
    ],
    [
      'unknown description line count with action button',
      {
        titleLineCount: 1,
        hasDescription: true,
        descriptionLineCount: null,
        hasActionButton: true,
        hasTrailingTextButton: false,
      },
      true,
    ],
  ] as const)('shouldTopAlignToastContent: %s', (_label, input, expected) => {
    expect(shouldTopAlignToastContent(input)).toBe(expected);
  });

  it.each([
    [
      'label-based close button',
      {
        variant: ButtonVariants.Secondary,
        label: 'Track',
        onPress: jest.fn(),
      },
      true,
    ],
    [
      'icon close button',
      {
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
        onPress: jest.fn(),
      },
      false,
    ],
  ] as const)('hasTrailingTextButton: %s', (_label, options, expected) => {
    expect(hasTrailingTextButton(options)).toBe(expected);
  });
});
