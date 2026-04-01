# Telegram OIDC Login Bot Creation and Management

## Purpose

This document explains how to create, configure, and maintain the Telegram bot used for "Login with Telegram" through the OIDC flow.

## Step 1: Create the Telegram Bot

### Prerequisites

- A company-owned Telegram account to act as the bot owner

### Creation Steps

1. Open Telegram and start a conversation with `@BotFather`.
2. Send `/newbot`.
3. Choose a display name, for example `MetaMask Login`.
4. Choose a username ending with `bot`, for example `metamask_login_bot`.
5. `@BotFather` will respond with a bot token.

Create one bot per environment.

## Step 2: Configure Web Login (OIDC)

1. In the `@BotFather` conversation, send `/mybots`.
2. Select the bot you created.
3. Navigate to `Bot Settings > Web Login` or `Login URL`.
4. Click `Switch to OpenID Connect Login`.
5. Add the callback URL.
6. `@BotFather` will issue:
   - `Client ID` as a numeric identifier
   - `Client Secret` as a long alphanumeric string

## Configure Trusted Origin and Redirect URI

### Redirect URI / Callback URL

| Environment | Example Callback URL                                                     |
| ----------- | ------------------------------------------------------------------------ |
| Production  | `https://authentication.api.cx.metamask.io/api/v2/telegram/callback`     |
| UAT         | `https://authentication.uat-api.cx.metamask.io/api/v2/telegram/callback` |
| Development | `https://authentication.dev-api.cx.metamask.io/api/v2/telegram/callback` |

### Trusted Origin

| Environment | Example Trusted Origin                          |
| ----------- | ----------------------------------------------- |
| Production  | `https://authentication.api.cx.metamask.io`     |
| UAT         | `https://authentication.uat-api.cx.metamask.io` |
| Development | `https://authentication.dev-api.cx.metamask.io` |

## Step 3: Data to Provide to the Engineering Team

After bot creation and Web Login setup, provide the following to the engineering team:

| Data          | Description                             |
| ------------- | --------------------------------------- |
| Client ID     | Telegram-issued OIDC client identifier  |
| Client Secret | Telegram-issued OIDC client secret      |
| Redirect URI  | Callback URL registered in `@BotFather` |

## Secret Rotation

### Rotation Steps

1. Confirm the target bot and environment.
2. Notify stakeholders that Telegram login may have a brief interruption.
3. In `@BotFather`, navigate to the bot's Web Login settings and regenerate the Client Secret.

### Impact During Rotation

- Telegram issues a new Client Secret and the old one is immediately invalidated.
- Any login flow that is mid-exchange at the moment of rotation may fail.
- Plan rotation during a low-traffic window or accept a brief interruption, typically less than one minute.

## Bot Ownership

### Ownership Transfer

Telegram supports bot ownership transfer through `@BotFather`:

1. The current owner opens `@BotFather` and selects the bot.
2. Use the transfer option to move ownership to the new company account.

## References

- Telegram Bot Features: <https://core.telegram.org/bots/features>
- Telegram Login / Web Login: <https://core.telegram.org/bots/telegram-login>
- Telegram BotFather: <https://t.me/BotFather>
