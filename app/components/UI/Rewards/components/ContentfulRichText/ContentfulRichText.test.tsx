import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { Json } from '@metamask/utils';
import ContentfulRichText, { documentToPlainText } from './ContentfulRichText';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

type RichTextNode = Record<string, Json>;

const makeDoc = (...content: RichTextNode[]): Json => ({
  nodeType: 'document',
  data: {},
  content,
});

const paragraph = (...children: RichTextNode[]): RichTextNode => ({
  nodeType: 'paragraph',
  data: {},
  content: children,
});

const text = (value: string, marks: { type: string }[] = []): RichTextNode => ({
  nodeType: 'text',
  value,
  marks: marks as Json[],
  data: {},
});

const hyperlink = (uri: string, linkText: string): RichTextNode => ({
  nodeType: 'hyperlink',
  data: { uri },
  content: [text(linkText)],
});

describe('ContentfulRichText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for invalid document', () => {
    const { toJSON } = render(
      <ContentfulRichText document={null as unknown as Json} testID="rt" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('returns null for a non-document object', () => {
    const { toJSON } = render(
      <ContentfulRichText document={{ foo: 'bar' }} testID="rt" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders a simple paragraph with plain text', () => {
    const doc = makeDoc(paragraph(text('Hello world')));
    const { getByText } = render(
      <ContentfulRichText document={doc} testID="rt" />,
    );
    expect(getByText('Hello world')).toBeOnTheScreen();
  });

  it('renders bold text', () => {
    const doc = makeDoc(paragraph(text('bold text', [{ type: 'bold' }])));
    const { getByText } = render(
      <ContentfulRichText document={doc} testID="rt" />,
    );
    expect(getByText('bold text')).toBeOnTheScreen();
  });

  it('renders a hyperlink and opens in-app browser on press', () => {
    const doc = makeDoc(
      paragraph(
        text('See '),
        hyperlink('https://example.com', 'our terms'),
        text(' for details.'),
      ),
    );
    const { getByText } = render(
      <ContentfulRichText document={doc} testID="rt" />,
    );
    fireEvent.press(getByText('our terms'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: expect.objectContaining({
        newTabUrl: 'https://example.com',
      }),
    });
  });

  it('renders multiple paragraphs', () => {
    const doc = makeDoc(
      paragraph(text('First paragraph')),
      paragraph(text('Second paragraph')),
    );
    const { getByText } = render(
      <ContentfulRichText document={doc} testID="rt" />,
    );
    expect(getByText('First paragraph')).toBeOnTheScreen();
    expect(getByText('Second paragraph')).toBeOnTheScreen();
  });

  it('renders an unordered list with bullets', () => {
    const doc = makeDoc({
      nodeType: 'unordered-list',
      data: {},
      content: [
        {
          nodeType: 'list-item',
          data: {},
          content: [paragraph(text('Item one'))],
        },
        {
          nodeType: 'list-item',
          data: {},
          content: [paragraph(text('Item two'))],
        },
      ],
    });
    const { getByText, getAllByText } = render(
      <ContentfulRichText document={doc} testID="rt" />,
    );
    expect(getByText('Item one')).toBeOnTheScreen();
    expect(getByText('Item two')).toBeOnTheScreen();
    expect(getAllByText('• ').length).toBe(2);
  });

  it('renders an ordered list with numbers', () => {
    const doc = makeDoc({
      nodeType: 'ordered-list',
      data: {},
      content: [
        {
          nodeType: 'list-item',
          data: {},
          content: [paragraph(text('First'))],
        },
        {
          nodeType: 'list-item',
          data: {},
          content: [paragraph(text('Second'))],
        },
      ],
    });
    const { getByText } = render(
      <ContentfulRichText document={doc} testID="rt" />,
    );
    expect(getByText('1. ')).toBeOnTheScreen();
    expect(getByText('2. ')).toBeOnTheScreen();
  });

  it('renders a heading', () => {
    const doc = makeDoc({
      nodeType: 'heading-2',
      data: {},
      content: [text('Title')],
    });
    const { getByText } = render(
      <ContentfulRichText document={doc} testID="rt" />,
    );
    expect(getByText('Title')).toBeOnTheScreen();
  });

  it('sets the testID on the container', () => {
    const doc = makeDoc(paragraph(text('test')));
    const { getByTestId } = render(
      <ContentfulRichText document={doc} testID="my-rich-text" />,
    );
    expect(getByTestId('my-rich-text')).toBeOnTheScreen();
  });

  it('renders a text node that has no marks property', () => {
    const doc = makeDoc(
      paragraph({
        nodeType: 'text',
        value: 'no marks',
        data: {},
      }),
    );
    const { getByText } = render(
      <ContentfulRichText document={doc} testID="rt" />,
    );
    expect(getByText('no marks')).toBeOnTheScreen();
  });
});

describe('documentToPlainText', () => {
  it('returns a clean plain string unchanged', () => {
    expect(documentToPlainText('hello')).toBe('hello');
  });

  it('strips U+FFFD replacement character from a plain string', () => {
    expect(
      documentToPlainText('Trade tokenized stocks, \uFFFDETFs and more'),
    ).toBe('Trade tokenized stocks, ETFs and more');
  });

  it('strips U+FFFC object replacement character from a plain string', () => {
    expect(documentToPlainText('before\uFFFCafter')).toBe('beforeafter');
  });

  it('strips zero-width spaces from a plain string', () => {
    expect(documentToPlainText('foo\u200Bbar')).toBe('foobar');
  });

  it('collapses multiple spaces after stripping special chars in a plain string', () => {
    expect(documentToPlainText('foo  \uFFFD  bar')).toBe('foo bar');
  });

  it('returns empty string for null', () => {
    expect(documentToPlainText(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(documentToPlainText(undefined)).toBe('');
  });

  it('returns empty string for a number', () => {
    expect(documentToPlainText(42)).toBe('');
  });

  it('extracts value from a text node', () => {
    expect(documentToPlainText({ nodeType: 'text', value: 'leaf' })).toBe(
      'leaf',
    );
  });

  it('returns empty string for a text node whose value is not a string', () => {
    expect(documentToPlainText({ nodeType: 'text', value: 99 })).toBe('');
  });

  it('recursively extracts text from a document with nested content', () => {
    const doc = {
      nodeType: 'document',
      content: [
        {
          nodeType: 'paragraph',
          content: [
            { nodeType: 'text', value: 'Hello' },
            { nodeType: 'text', value: 'world' },
          ],
        },
      ],
    };
    expect(documentToPlainText(doc)).toBe('Hello world');
  });

  it('returns empty string for an empty content array', () => {
    expect(documentToPlainText({ nodeType: 'document', content: [] })).toBe('');
  });

  it('returns empty string for an object with no nodeType and no content', () => {
    expect(documentToPlainText({ foo: 'bar' })).toBe('');
  });
});
