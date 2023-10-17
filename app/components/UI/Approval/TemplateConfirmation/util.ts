import { ResultComponent } from '@metamask/approval-controller';
import {
  TemplateRendererComponent,
  TemplateRendererInput,
} from '../../TemplateRenderer/types';
import {
  safeComponentList,
  SafeComponentListValues,
} from '../../TemplateRenderer/SafeComponentList';

/**
 * Processes an error message or ResultComponent and returns a TemplateRendererComponent
 * or an array of strings | TemplateRendererComponent.
 *
 * @param input - The message or component to process.
 * @param fallback - The fallback message to use when the input is not valid.
 * @returns The processed error component.
 */
export function processError(
  input: undefined | string | ResultComponent | ResultComponent[],
  fallback: string,
): TemplateRendererInput {
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
): TemplateRendererInput {
  const currentInput = convertResultComponents(input) ?? fallback;

  if (typeof currentInput !== 'string') {
    return currentInput;
  }

  return applyBold(currentInput);
}

/**
 * Processes an array of string | ResultComponent and returns
 * an array of strings | TemplateRendererComponent.
 *
 * @param input - The header to process.
 * @returns The processed header.
 */
export function processHeader(
  input: (string | ResultComponent)[],
): (string | TemplateRendererComponent)[] {
  const currentInput = convertResultComponents(input);

  return Array.isArray(currentInput)
    ? currentInput
    : [
        {
          key: `${currentInput}`,
          element: 'Text',
          children: currentInput,
        },
      ];
}

/**
 * Checks if the provided name is a valid element name from SafeComponentListValues.
 *
 * @param {string} name - The element name to be validated.
 * @returns {boolean} - Returns true if the name is a valid element, false otherwise.
 */
export function isValidElementName(
  name: string,
): name is keyof SafeComponentListValues {
  return name in safeComponentList;
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
  if (!isValidElementName(name)) {
    throw new Error(
      `${name} is not in the safe component list for template renderer`,
    );
  }
  return {
    key,
    element: name,
    props: properties,
    children: convertResultComponents(children),
  };
}

function convertResultComponents(
  input: undefined | string | ResultComponent | (string | ResultComponent)[],
): undefined | TemplateRendererInput {
  if (input === undefined) {
    return undefined;
  }

  if (typeof input === 'string') {
    return input;
  }

  if (Array.isArray(input)) {
    const isArrayOfResultComponents = input.every(
      (item): item is ResultComponent =>
        typeof item === 'object' && item.name !== undefined,
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

  if (!isValidElementName(input.name)) {
    throw new Error(
      `${input.name} is not in the safe component list for template renderer`,
    );
  }

  return {
    key: input.key,
    element: input.name,
    props: input.properties,
    children: convertResultComponents(input.children),
  };
}
