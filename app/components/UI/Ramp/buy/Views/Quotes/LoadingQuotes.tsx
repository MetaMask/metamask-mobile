import React from 'react';
import Row from '../../../common/components/Row';
import SkeletonQuote from '../../../common/components/SkeletonQuote';

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
