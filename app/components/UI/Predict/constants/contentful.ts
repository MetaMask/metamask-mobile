import { isProduction } from '../../../../util/environment';

export const CONTENTFUL_SPACE_ID = () =>
  process.env.PREDICT_CONTENTFUL_SPACE_ID;

export const CONTENTFUL_ACCESS_TOKEN = () =>
  process.env.PREDICT_CONTENTFUL_ACCESS_TOKEN;

export const CONTENTFUL_ENVIRONMENT = isProduction() ? 'main' : 'dev';

export const CONTENTFUL_DEFAULT_DOMAIN = isProduction()
  ? 'cdn.contentful.com'
  : 'preview.contentful.com';
