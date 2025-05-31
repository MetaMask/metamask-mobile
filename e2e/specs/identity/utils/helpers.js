import { MOCK_SRP_E2E_IDENTIFIER_BASE_KEY } from './mocks';

export const determineIfFeatureEntryFromURL = (url) => {
  const decodedUrl = decodeURIComponent(url);
  return (
    decodedUrl.substring(decodedUrl.lastIndexOf('userstorage') + 12).split('/')
      .length === 2
  );
};

export const getDecodedProxiedURL = (url) =>
  decodeURIComponent(String(new URL(url).searchParams.get('url')));

export const getSrpIdentifierFromHeaders = (headers) => {
  const authHeader = headers.authorization;
  return (
    authHeader?.toString()?.split(' ')[1] ||
    `${MOCK_SRP_E2E_IDENTIFIER_BASE_KEY}_1`
  );
};
