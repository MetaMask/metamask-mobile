#!/usr/bin/env node
// eslint-disable-next-line import/no-commonjs
const axios = require('axios');

const SLACK_TOKEN = process.env.MM_SLACK_TOKEN;
const SLACK_SECRET = process.env.MM_SLACK_SECRET;
const SLACK_ROOM = process.env.MM_SLACK_ROOM;
const BITRISE_GIT_COMMIT = process.env.BITRISE_GIT_COMMIT;
const BITRISE_GIT_COMMIT_MESSAGE = process.env.BITRISE_GIT_MESSAGE;
const E2E_SUCCESS = process.env.BITRISE_BUILD_STATUS || false;
const BITRISE_BUILD_URL = process.env.BITRISE_BUILD_URL;
const BITRISE_BUILD_NUMBER = process.env.BITRISE_BUILD_NUMBER;
const GIT_REPOSITORY_URL = 'https://github.com/MetaMask/metamask-mobile';
const BITRISE_APP_TITLE = process.env.BITRISE_APP_TITLE;

start().catch(console.error);

async function start() {
  const content = {
    text: `*${
      E2E_SUCCESS === '0'
        ? ':large_green_circle: SUCCESSFUL'
        : ':red_circle: FAILED'
    } E2E tests* for ${BITRISE_APP_TITLE} <${BITRISE_BUILD_URL}|build #${BITRISE_BUILD_NUMBER}>`,
    attachments: [
      {
        title_link: `${GIT_REPOSITORY_URL}/commit/${BITRISE_GIT_COMMIT}`,
        title: `commit #${BITRISE_GIT_COMMIT}`,
        text: BITRISE_GIT_COMMIT_MESSAGE,
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
