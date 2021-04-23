#!/usr/bin/env node
/* eslint-disable import/no-commonjs */
const request = require('request-promise');
const github = require('octonode');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ANDROID_APK_LINK = process.env.BITRISE_PUBLIC_INSTALL_PAGE_URL;
const ANDROID_AAB_LINK = process.env.BITRISE_PUBLIC_INSTALL_PAGE_URL;
const CIRCLE_PROJECT_REPONAME = 'metamask-mobile';
const BITRISEIO_GIT_REPOSITORY_OWNER = process.env.BITRISEIO_GIT_REPOSITORY_OWNER;
const SLACK_TOKEN = process.env.MM_SLACK_TOKEN;
const SLACK_SECRET = process.env.MM_SLACK_SECRET;
const SLACK_ROOM = process.env.MM_SLACK_ROOM;
const BITRISE_GIT_COMMIT = process.env.BITRISE_GIT_COMMIT;

start().catch(console.error);

async function getPRInfo() {
	const client = github.client(GITHUB_TOKEN);
	const REPO = client.repo(`${BITRISEIO_GIT_REPOSITORY_OWNER}/${CIRCLE_PROJECT_REPONAME}`);
	const response = await REPO.prsAsync({ state: 'closed' });
	const PR = response[0].find(obj => obj.merge_commit_sha === BITRISE_GIT_COMMIT);
	console.log('BITRISE_GIT_COMMIT', BITRISE_GIT_COMMIT);
	console.log('PR', PR);

	if (PR) {
		return { title: PR.title, number: PR.number, url: PR.html_url };
	}
}

async function start() {
	const PR_INFO = await getPRInfo();
	console.log('PR_URL', PR_INFO.url);
	console.log('BITRISE_GIT_COMMIT', BITRISE_GIT_COMMIT);

	const content = {
		text: `THIS IS A TEST FOR THE NEW BITRISE INTEGRATION - NEW BUILDS AVAILABLE! Including <${PR_INFO.url}|#${
			PR_INFO.number
		} - ${PR_INFO.title}>`,
		attachments: [
			{
				title_link: 'itms-beta://beta.itunes.apple.com/v1/app/1438144202',
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
