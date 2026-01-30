import { MockEventsObject } from '../../../framework';

export const ACL_EXECUTION_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/acl\.execution\.metamask\.io\/latest\/registry\.json(\?.*)?$/,
      responseCode: 200,
      response: {},
    },
    {
      urlEndpoint:
        /^https:\/\/acl\.execution\.metamask\.io\/latest\/signature\.json(\?.*)?$/,
      responseCode: 200,
      response: {},
    },
  ],
};
