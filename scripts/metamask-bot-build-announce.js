#!/usr/bin/env node
const request = require('request-promise');
const github = require('octonode');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const CIRCLE_BUILD_NUM = process.env.CIRCLE_BUILD_NUM;
const CIRCLE_PROJECT_REPONAME = process.env.CIRCLE_PROJECT_REPONAME;
const CIRCLE_PROJECT_USERNAME = process.env.CIRCLE_PROJECT_USERNAME;
const CIRCLE_SHA1 = process.env.CIRCLE_SHA1;
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_SECRET = process.env.SLACK_SECRET;
const SLACK_ROOM = process.env.SLACK_ROOM;

start().catch(console.error);

async function getPRInfo () {

	const client = github.client(GITHUB_TOKEN);
	const REPO = client.repo(`${CIRCLE_PROJECT_USERNAME}/${CIRCLE_PROJECT_REPONAME}`);

	const response = await REPO.prsAsync({state: 'closed'});
	const PR = response[0].find( obj => obj.merge_commit_sha === CIRCLE_SHA1);
	if(PR){
		return { title: PR.title, number: PR.number, url: PR.html_url };
	}
}

async function start() {

	const PR_INFO = await getPRInfo();

	console.log('PR_URL', PR_INFO.url);
	console.log('CIRCLE_SHA1', CIRCLE_SHA1);
	console.log('CIRCLE_BUILD_NUM', CIRCLE_BUILD_NUM);


	const APK_BUILD_LINK_BASE = `https://${CIRCLE_BUILD_NUM}-141427485-gh.circle-artifacts.com/0`;

	const APK_LINK = `${APK_BUILD_LINK_BASE}/builds/app-release.apk`;
	const AAP_LINK = `${APK_BUILD_LINK_BASE}/bundle/app-release.aab`;


	const content = {
		"text": `NEW BUILDS AVAILABLE! Including <${PR_INFO.url}|#${PR_INFO.number} - ${PR_INFO.title}>`,
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
			},
			{
				"title_link": AAP_LINK,
				"title" : "Android App Bundle",
				"text": "Download AAP",
				"thumb_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Android_robot.svg/511px-Android_robot.svg.png"
			}
		]
	};

	const JSON_PAYLOAD = JSON.stringify(content);
	const SLACK_API_URI = `https://hooks.slack.com/services/${SLACK_TOKEN}/${SLACK_SECRET}/${SLACK_ROOM}`


	await request({
		method: 'POST',
		uri: SLACK_API_URI,
		body: JSON_PAYLOAD,
		headers: {
			'Content-type': 'application/json',
		}
	});
}


