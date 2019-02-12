#!/usr/bin/env node
const request = require('request-promise');
const github = require('octonode');


start().catch(console.error);

async function getPullRequestTitle () {

	const client = github.client(process.env.GITHUB_TOKEN);

	const CIRCLE_PR_NUMBER = process.env.CIRCLE_PULL_REQUEST.split('/').pop();

	const PR = client.pr('metamask/MetaMask', parseInt(CIRCLE_PR_NUMBER, 10));

	const response = await PR.infoAsync();
	if(response && response[0] && response[0].title){
		return response[0].title;
	}
}

async function start() {
	const CIRCLE_PULL_REQUEST = process.env.CIRCLE_PULL_REQUEST;
	console.log('CIRCLE_PULL_REQUEST', CIRCLE_PULL_REQUEST);
	const CIRCLE_SHA1 = process.env.CIRCLE_SHA1;
	console.log('CIRCLE_SHA1', CIRCLE_SHA1);
	const CIRCLE_BUILD_NUM = process.env.CIRCLE_BUILD_NUM;
	console.log('CIRCLE_BUILD_NUM', CIRCLE_BUILD_NUM);

	if (!CIRCLE_PULL_REQUEST) {
		console.warn(`No pull request detected for commit "${CIRCLE_SHA1}"`);
		return;
	}


	const APK_BUILD_LINK_BASE = `https://${CIRCLE_BUILD_NUM}-141427485-gh.circle-artifacts.com/0`;

	const APK_LINK = `${APK_BUILD_LINK_BASE}/builds/app-release.apk`;

	const GITHUB_PR_TITLE = await getPullRequestTitle();

	const CIRCLE_PR_NUMBER = process.env.CIRCLE_PULL_REQUEST.split('/').pop();


	const content = {
		"text": `NEW BUILDS AVAILABLE! Including <${CIRCLE_PULL_REQUEST}|#${CIRCLE_PR_NUMBER} - ${GITHUB_PR_TITLE}>`,
		"attachments": [
			{
				"title_link": "itms-beta://beta.itunes.apple.com/v1/app/1438144202",
				"title": "iOS",
				"text": "Install via TestFlight",
				"thumb_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Apple-Apple.svg/488px-Apple-Apple.svg.png"
			},
			{
				"title_link": APK_LINK,
				"title" : "Android",
				"text": "Download APK",
				"thumb_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Android_robot.svg/511px-Android_robot.svg.png"
			}
		]
	};

	const JSON_PAYLOAD = JSON.stringify(content);
	const SLACK_API_URI = `https://hooks.slack.com/services/${process.env.SLACK_TOKEN}/${process.env.SLACK_SECRET}/${process.env.SLACK_ROOM}`


	await request({
		method: 'POST',
		uri: SLACK_API_URI,
		body: JSON_PAYLOAD,
		headers: {
			'Content-type': 'application/json',
		}
	});
}


