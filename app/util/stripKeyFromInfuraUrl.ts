import { INFURA_PROJECT_ID } from '../constants/network';

const stripKeyFromInfuraUrl = (endpoint: string | undefined) => {
  if (!endpoint) return endpoint;

  let modifiedEndpoint = endpoint;

  if (modifiedEndpoint.endsWith('/v3/{infuraProjectId}')) {
    modifiedEndpoint = modifiedEndpoint.replace('/v3/{infuraProjectId}', '');
  } else if (modifiedEndpoint.endsWith(`/v3/${INFURA_PROJECT_ID}`)) {
    modifiedEndpoint = modifiedEndpoint.replace(`/v3/${INFURA_PROJECT_ID}`, '');
  }

  return modifiedEndpoint;
};

export default stripKeyFromInfuraUrl;
