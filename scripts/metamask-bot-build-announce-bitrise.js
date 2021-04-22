#!/usr/bin/env node
/* eslint-disable import/no-commonjs */
const request = require('request-promise');

const ANDROID_APK_LINK = process.env.BITRISE_PUBLIC_INSTALL_PAGE_URL;
const ANDROID_AAB_LINK = process.env.BITRISE_PUBLIC_INSTALL_PAGE_URL;
// const IOS_APP_LINK = process.env.IOS_APP_LINK;
const SLACK_TOKEN = process.env.MM_SLACK_TOKEN;
const SLACK_SECRET = process.env.MM_SLACK_SECRET;
const SLACK_ROOM = process.env.MM_SLACK_ROOM;
const BITRISEIO_PULL_REQUEST_REPOSITORY_URL = process.env.BITRISEIO_PULL_REQUEST_REPOSITORY_URL;
const BITRISE_PULL_REQUEST = process.env.BITRISEIO_PULL_REQUEST;
const BITRISE_GIT_MESSAGE = process.env.BITRISEIO_GIT_MESSAGE;

start().catch(console.error);

async function start() {
	const content = {
		text: `THIS IS A TEST FOR THE NEW BITRISE INTEGRATION - NEW BUILDS AVAILABLE! Including <${BITRISEIO_PULL_REQUEST_REPOSITORY_URL}|#${BITRISE_PULL_REQUEST} - ${BITRISE_GIT_MESSAGE}>`,
		attachments: [
			{
				title_link: 'TEST',
				title: 'iOS',
				text: 'Install via Bitrise',
				thumb_url:
					'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/202px-Apple_logo_black.svg.png'
			},
			{
				title_link: ANDROID_APK_LINK,
				title: 'Android',
				text: 'Download APK via Bitrise',
				thumb_url:
					'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Android_robot.svg/511px-Android_robot.svg.png'
			},
			{
				title_link: ANDROID_AAB_LINK,
				title: 'Android App Bundle',
				text: 'Download AAB via Bitrise',
				thumb_url:
					'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Android_robot.svg/511px-Android_robot.svg.png'
			}
		]
	};

	const JSON_PAYLOAD = JSON.stringify(content);
	const SLACK_API_URI = `https://hooks.slack.com/services/${SLACK_TOKEN}/${SLACK_SECRET}/${SLACK_ROOM}`;

	await request({
		method: 'POST',
		uri: SLACK_API_URI,
		body: JSON_PAYLOAD,
		headers: {
			'Content-type': 'application/json'
		}
	});
}
