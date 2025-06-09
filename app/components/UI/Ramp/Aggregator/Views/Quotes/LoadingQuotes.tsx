import React from 'react';
import Row from '../../components/Row';
import SkeletonQuote from '../../components/SkeletonQuote';

interface Props {
  count?: number;
}

function LoadingQuotes({ count }: Props) {
  if (count) {
    return (
      <>
        {Array.from({ length: count }, (_, index) => (
          <Row key={index} first={index === 0}>
            <SkeletonQuote collapsed />
          </Row>
        ))}
      </>
    );
  }

  return (
    <>
      <Row first>
        <SkeletonQuote />
      </Row>
      <Row>
        <SkeletonQuote collapsed />
      </Row>
      <Row>
        <SkeletonQuote collapsed />
      </Row>
    </>
  );
}
export default LoadingQuotes;
