import { writeSmartE2eCatalog } from './catalog-from-tags';

const outputPath = writeSmartE2eCatalog();
console.log(
  `Wrote ${outputPath} from tests/tags.js and tests/tags.performance.js`,
);
