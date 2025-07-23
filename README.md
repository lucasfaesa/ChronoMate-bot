# 🕒 ChronoMate — Timezone Converter Slack Bot

ChronoMate is a Slack bot that helps teams schedule across timezones by converting local times for everyone in a channel.

Type `/tc tomorrow at 9am`, and ChronoMate will reply with the converted time for all users, based on their individual Slack timezones.

---

## ✨ Features

- 🔁 Converts natural language like `tomorrow at 9am` or `next Friday 14:30`
- 🌍 Automatically detects the timezones of everyone in the channel
- 🧠 Skips bots and deduplicates timezones
- 🧵 Posts inline or in a thread (if too many timezones)
- 🔐 No persistent storage — all data is processed in memory

---

## 🛠️ Setup & Installation

### 1. Clone the project

```bash
git clone https://github.com/lucasfaesa/chronomate.git
cd chronomate
npm install
```

### 2. Set environment variables

Create a .env file with the following:
```bash
SLACK_BOT_TOKEN=your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
SLACK_SCOPES=commands,users:read,chat:write,channels:read,groups:read,mpim:read,im:read
REDIRECT_URI=https://your-deployment-url.com/slack/oauth_redirect
PORT=3000
```

### 3. Run locally (optional)
```bash
node index.js
```
Use ngrok to expose your local server:
```bash
ngrok http 3000
```
