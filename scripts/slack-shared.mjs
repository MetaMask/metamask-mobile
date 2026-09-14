/**
 * Small helpers shared between the RC/production and nightly Slack
 * notification scripts (scripts/slack-rc-notification.mjs and
 * scripts/slack-nightly-notification.mjs).
 */

/**
 * Check if a URL value is valid (not empty, null, placeholder, and proper URL format).
 * @param {string|undefined} url - The URL to check
 * @returns {boolean} Whether the URL is valid
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim().toLowerCase();
  if (trimmed === '' || trimmed === 'n/a' || trimmed === 'null' || trimmed === 'undefined') {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Post message to Slack channel using Web API. Never throws for Slack-side
 * errors (e.g. missing channel) — callers decide how to log/react.
 * @param {string} botToken - Slack bot token
 * @param {string} channelName - Channel name or ID to post to
 * @param {{blocks: object[], text: string}} payload - Slack message payload
 * @returns {Promise<{success: boolean, channelNotFound: boolean}>}
 */
export async function postToSlack(botToken, channelName, payload) {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel: channelName,
        blocks: payload.blocks,
        text: payload.text,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      // Check if channel doesn't exist
      if (data.error === 'channel_not_found') {
        return { success: false, channelNotFound: true };
      }
      throw new Error(`Slack API error: ${data.error}`);
    }

    console.log('✅ Slack notification sent successfully');
    return { success: true, channelNotFound: false };
  } catch (error) {
    console.error(`❌ Failed to post to Slack: ${error.message}`);
    return { success: false, channelNotFound: false };
  }
}
