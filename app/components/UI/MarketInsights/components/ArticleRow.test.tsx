import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import ArticleRow from './ArticleRow';
import type { Article } from '@metamask/ai-controllers';

const mockArticle: Article = {
  title: 'Bitcoin ETF inflows hit record high',
  url: 'https://coindesk.com/news/btc-etf-inflows',
  source: 'CoinDesk',
  date: '2026-03-15T10:00:00.000Z',
};

const mockArticleNoDate: Article = {
  title: 'Ethereum upgrade expected next quarter',
  url: 'https://theblock.co/news/eth-upgrade',
  source: 'The Block',
  date: '',
};

describe('ArticleRow', () => {
  it('renders the article title', () => {
    renderWithProvider(
      <ArticleRow article={mockArticle} onPress={jest.fn()} />,
    );
    expect(screen.getByText(mockArticle.title)).toBeOnTheScreen();
  });

  it('renders the article source', () => {
    renderWithProvider(
      <ArticleRow article={mockArticle} onPress={jest.fn()} />,
    );
    expect(screen.getByText(mockArticle.source)).toBeOnTheScreen();
  });

  it('renders relative date when article has a date', () => {
    renderWithProvider(
      <ArticleRow article={mockArticle} onPress={jest.fn()} />,
    );
    // A separator dot is shown between source and date
    expect(screen.getByText('•')).toBeOnTheScreen();
  });

  it('does not render date separator when article has no date', () => {
    renderWithProvider(
      <ArticleRow article={mockArticleNoDate} onPress={jest.fn()} />,
    );
    expect(screen.queryByText('•')).toBeNull();
  });

  it('calls onPress with the article URL when tapped', () => {
    const onPress = jest.fn();
    renderWithProvider(<ArticleRow article={mockArticle} onPress={onPress} />);
    fireEvent.press(screen.getByText(mockArticle.title));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(mockArticle.url);
  });

  it('renders a bottom border when isLastItem is false', () => {
    const { toJSON } = renderWithProvider(
      <ArticleRow
        article={mockArticle}
        onPress={jest.fn()}
        isLastItem={false}
      />,
    );
    // Tailwind compiles 'border-b border-muted' to resolved style props at render time.
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"borderBottomWidth":1');
  });

  it('does not render a bottom border when isLastItem is true', () => {
    const { toJSON } = renderWithProvider(
      <ArticleRow article={mockArticle} onPress={jest.fn()} isLastItem />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('"borderBottomWidth":1');
  });
});
