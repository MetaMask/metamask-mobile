import React from 'react';
import Row from '../../components/Row';
import SkeletonQuote from '../../components/SkeletonQuote';

function LoadingQuotes() {
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
