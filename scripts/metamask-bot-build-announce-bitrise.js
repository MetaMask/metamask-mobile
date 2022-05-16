#!/usr/bin/env node
// eslint-disable-next-line import/no-commonjs
const axios = require('axios');

const ANDROID_APK_LINK = process.env.BITRISE_PUBLIC_INSTALL_PAGE_URL;
const SLACK_TOKEN = process.env.MM_SLACK_TOKEN;
const SLACK_SECRET = process.env.MM_SLACK_SECRET;
const SLACK_ROOM = process.env.MM_SLACK_ROOM;
const BITRISE_GIT_COMMIT = process.env.BITRISE_GIT_COMMIT;
const BITRISE_GIT_COMMIT_MESSAGE = process.env.BITRISE_GIT_MESSAGE;
start().catch(console.error);

async function start() {
  const content = {
    text: `NEW BUILDS AVAILABLE! Commit <https://github.com/MetaMask/metamask-mobile/commit/${BITRISE_GIT_COMMIT}|#${BITRISE_GIT_COMMIT_MESSAGE}>`,
    attachments: [
      {
        title_link: 'itms-beta://beta.itunes.apple.com/v1/app/1438144202',
        title: 'iOS',
        text: 'Install via TestFlight',
        thumb_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/202px-Apple_logo_black.svg.png',
      },
      {
        title_link: ANDROID_APK_LINK,
        title: 'Android',
        text: 'Download APK via Bitrise',
        thumb_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Android_robot.svg/511px-Android_robot.svg.png',
      },
    ],
  };

  const JSON_PAYLOAD = JSON.stringify(content);
  const SLACK_API_URI = `https://hooks.slack.com/services/${SLACK_TOKEN}/${SLACK_SECRET}/${SLACK_ROOM}`;

  const headers = {
    'Content-type': 'application/json',
  };
  await axios.post(SLACK_API_URI, JSON_PAYLOAD, { headers });
}
