/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import portfinder from 'portfinder';
import SegmentHelper from './SegmentHelper';

export const startSegmentTracking = async (port) => {
  const mockServer = getLocal();
  port = port || (await portfinder.getPortPromise());

  await mockServer.start(port);
  await mockServer
    .forPost('/track_test_mm')
    .thenCallback(async (req) => {
      let body;
      try {
        body = await req.body.getJson();
        SegmentHelper.handleTrackEvent(body);
        console.log('TRACK EVENT:', body);
      } catch (e) {
        console.log('TRACK EVENT error:', e);
      }

      return {
        status: 200,
        json: body
      };
    });

  return mockServer;
};
