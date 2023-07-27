import { ResultComponent } from '@metamask/approval-controller';

interface TemplateRendererComponent {
  key: string;
  element: string;
  props?: Record<string, unknown>;
  children?:
    | string
    | TemplateRendererComponent
    | (string | TemplateRendererComponent)[];
}

/**
 * Processes an error message or ResultComponent and returns a TemplateRendererComponent
 * or an array of strings | TemplateRendererComponents.
 *
 * @param input - The message or component to process.
 * @param fallback - The fallback message to use when the input is not valid.
 * @returns The processed error component.
 */
export function processError(
  input: undefined | string | ResultComponent | ResultComponent[],
  fallback: string,
): string | TemplateRendererComponent | (string | TemplateRendererComponent)[] {
  const currentInput = convertResultComponents(input) ?? fallback;

  if (typeof currentInput !== 'string') {
    return currentInput;
  }

  return [
    {
      key: `${currentInput}`,
      element: 'Text',
      children: currentInput,
    },
  ];
}

/**
 * Processes a string or ResultComponent and returns a string or TemplateRendererComponent
 * or an array of strings | TemplateRendererComponents.
 *
 * @param input - The message or component to process.
 * @param fallback - The fallback string to use when the input is not valid.
 * @returns The processed message.
 */
export function processString(
  input: undefined | string | ResultComponent | ResultComponent[],
  fallback: string,
): string | TemplateRendererComponent | (string | TemplateRendererComponent)[] {
  const currentInput = convertResultComponents(input) ?? fallback;

  if (typeof currentInput !== 'string') {
    return currentInput;
  }

  return applyBold(currentInput);
}

/**
 * Processes a message or ResultComponent and returns
 * an array of strings | TemplateRendererComponents.
 *
 * @param input - The component to process.
 * @returns The processed component.
 */
export function processComponent(
  input: undefined | string | ResultComponent | ResultComponent[],
): (string | TemplateRendererComponent)[] {
  const currentInput = convertResultComponents(input);

  if (!currentInput) {
    return [];
  }

  if (typeof currentInput !== 'string') {
    if (Array.isArray(currentInput)) {
      return currentInput;
    }
    return [currentInput];
  }
  return [
    {
      key: `${currentInput}`,
      element: 'Text',
      children: currentInput,
    },
  ];
}

/**
 * Applies bold formatting to the message.
 *
 * @param message - The input message to apply bold formatting to.
 * @returns The formatted message.
 */
function applyBold(message: string): (string | TemplateRendererComponent)[] {
  const boldPattern = /\*\*(.+?)\*\*/gu;

  return findMarkdown(message, boldPattern, (formattedText, index) => ({
    key: `bold-${index}`,
    element: 'Text',
    children: formattedText,
    props: {
      style: { fontWeight: 'bold' },
    },
  }));
}

/**
 * Finds and formats markdown elements in the given text.
 *
 * @param text - The input text to search for markdown elements.
 * @param pattern - The pattern to match the markdown elements.
 * @param getElement - The callback function to create the formatted elements.
 * @returns The array of formatted elements.
 */
function findMarkdown(
  text: string,
  pattern: RegExp,
  getElement: (
    formattedText: string,
    index: number,
  ) => TemplateRendererComponent,
): (string | TemplateRendererComponent)[] {
  let position = 0;
  let index = 0;

  const matches = Array.from(text.matchAll(pattern));
  const elements = [];

  for (const match of matches) {
    const rawText = text.substring(position, match.index);

    if (rawText.length) {
      elements.push(rawText);
    }

    const formattedText = match[1];
    const formattedElement = getElement(formattedText, index);

    elements.push(formattedElement);

    position = (match.index as number) + match[0].length;
    index += 1;
  }

  const finalRawText = text.substring(position);

  if (finalRawText.length) {
    elements.push(finalRawText);
  }

  return elements;
}
function convertResultComponentToTemplateRender(
  resultComponent: ResultComponent,
): TemplateRendererComponent {
  const { key, name, properties, children } = resultComponent;
  return {
    key,
    element: name,
    props: properties,
    children: convertResultComponents(children),
  };
}

export function convertResultComponents(
  input: undefined | string | ResultComponent | (string | ResultComponent)[],
):
  | undefined
  | string
  | TemplateRendererComponent
  | (string | TemplateRendererComponent)[] {
  if (input === undefined) {
    return undefined;
  }

  if (typeof input === 'string') {
    return input;
  }

  if (Array.isArray(input)) {
    const isArrayOfResultComponents = input.every(
      (item): item is ResultComponent =>
        typeof item === 'object' &&
        (item as ResultComponent).name !== undefined,
    );

    if (isArrayOfResultComponents) {
      const converted = input.map((value) =>
        convertResultComponentToTemplateRender(value),
      );

      return converted;
    }

    return input.map(convertResultComponents) as (
      | string
      | TemplateRendererComponent
    )[];
  }

  return {
    key: input.key,
    element: input.name,
    props: input.properties,
    children: convertResultComponents(input.children),
  };
}
