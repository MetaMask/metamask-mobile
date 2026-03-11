import React from 'react';
import { QuoteRow, QuoteRowProps } from './QuoteRow';

interface Props {
  data: QuoteRowProps[];
}

export const QuoteList = ({ data }: Props) =>
  data.map((quote) => <QuoteRow key={quote.quoteRequestId} {...quote} />);
