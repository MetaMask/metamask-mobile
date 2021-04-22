#!/usr/bin/env node
/* eslint-disable import/no-commonjs */
const request = require('request-promise');

const ANDROID_APK_LINK = process.env.ANDROID_APK_LINK;
const ANDROID_AAP_LINK = process.env.ANDROID_AAP_LINK;
const IOS_APP_LINK = process.env.IOS_APP_LINK;
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_SECRET = process.env.SLACK_SECRET;
const SLACK_ROOM = process.env.SLACK_ROOM;
const BITRISEIO_PULL_REQUEST_REPOSITORY_URL = process.env.BITRISEIO_PULL_REQUEST_REPOSITORY_URL;
const BITRISE_PULL_REQUEST = process.env.BITRISEIO_PULL_REQUEST;
const BITRISE_GIT_MESSAGE = process.env.BITRISEIO_GIT_MESSAGE;

start().catch(console.error);

async function start() {
	const content = {
		text: `NEW BUILDS AVAILABLE! Including <${BITRISEIO_PULL_REQUEST_REPOSITORY_URL}|#${BITRISE_PULL_REQUEST} - ${BITRISE_GIT_MESSAGE}>`,
		attachments: [
			{
				title_link: IOS_APP_LINK,
				title: 'iOS',
				text: 'Install via Bitrise',
				thumb_url:
					'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Apple-Apple.svg/488px-Apple-Apple.svg.png'
			},
			{
				title_link: ANDROID_APK_LINK,
				title: 'Android',
				text: 'Download APK',
				thumb_url:
					'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Android_robot.svg/511px-Android_robot.svg.png'
			},
			{
				title_link: ANDROID_AAP_LINK,
				title: 'Android App Bundle',
				text: 'Download AAP',
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
