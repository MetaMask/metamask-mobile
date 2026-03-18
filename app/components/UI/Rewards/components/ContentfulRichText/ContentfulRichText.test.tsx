import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ContentfulRichText from './ContentfulRichText';
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

interface RichTextNode {
  nodeType: string;
  data: Record<string, unknown>;
  content?: RichTextNode[];
  value?: string;
  marks?: { type: string }[];
}

const makeDoc = (...content: RichTextNode[]) => ({
  nodeType: 'document' as const,
  data: {},
  content,
});

const paragraph = (...children: RichTextNode[]) => ({
  nodeType: 'paragraph' as const,
  data: {},
  content: children,
});

const text = (
  value: string,
  marks: { type: string }[] = [],
): RichTextNode => ({
  nodeType: 'text' as const,
  value,
  marks,
  data: {},
});

const hyperlink = (uri: string, linkText: string): RichTextNode => ({
  nodeType: 'hyperlink' as const,
  data: { uri },
  content: [text(linkText)],
});

describe('ContentfulRichText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for invalid document', () => {
    const { toJSON } = render(
      <ContentfulRichText document={null as unknown} testID="rt" />,
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
    expect(getByText('Hello world')).toBeDefined();
  });

  it('renders bold text', () => {
    const doc = makeDoc(paragraph(text('bold text', [{ type: 'bold' }])));
    const { getByText } = render(
      <ContentfulRichText document={doc} testID="rt" />,
    );
    expect(getByText('bold text')).toBeDefined();
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
    expect(getByText('First paragraph')).toBeDefined();
    expect(getByText('Second paragraph')).toBeDefined();
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
    expect(getByText('Item one')).toBeDefined();
    expect(getByText('Item two')).toBeDefined();
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
    expect(getByText('1. ')).toBeDefined();
    expect(getByText('2. ')).toBeDefined();
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
    expect(getByText('Title')).toBeDefined();
  });

  it('sets the testID on the container', () => {
    const doc = makeDoc(paragraph(text('test')));
    const { getByTestId } = render(
      <ContentfulRichText document={doc} testID="my-rich-text" />,
    );
    expect(getByTestId('my-rich-text')).toBeDefined();
  });
});
