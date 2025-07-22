// index.js

const { App } = require('@slack/bolt');
const chrono = require('chrono-node');
const moment = require('moment-timezone');
require('dotenv').config();

// Helper: extract a human‑readable place name from an IANA tz string
function getPlaceName(tz) {
  const parts = tz.split('/');
  // use the part after the slash, or the whole string if none
  const raw = parts[1] || parts[0];
  // replace underscores with spaces
  return raw.replace(/_/g, ' ');
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.command('/tc', async ({ command, ack, respond, client }) => {
  await ack();

  try {
    // 1. sender's timezone
    const { user: sender } = (await client.users.info({ user: command.user_id })).user
      ? { user: (await client.users.info({ user: command.user_id })).user }
      : {};
    const senderTz = sender?.tz || 'UTC';

    // 2. parse the input in sender's tz
    const parsed = chrono.parseDate(command.text, new Date(), { timezone: senderTz });
    if (!parsed) {
      await respond("Could not parse that time.");
      return;
    }
    const baseTime = moment.tz(parsed, senderTz);

    // 3. fetch members of this channel
    const membersRes = await client.conversations.members({ channel: command.channel_id });
    const userIds = membersRes.members.filter((id) => !id.startsWith('B')); // skip bots

    // 4. collect each user's timezone
    const tzSet = new Set();
    for (const userId of userIds) {
      const { user } = await client.users.info({ user: userId });
      if (user?.tz) tzSet.add(user.tz);
    }

    // 5. build conversions
    const results = [...tzSet]
      .map((tz) => {
        const converted = baseTime.clone().tz(tz);
        return {
          tz,
          time: converted.format('HH:mm'),
          date: converted.format('MMMM D'),
          place: getPlaceName(tz)
        };
      })
      // sort by clock time
      .sort((a, b) => a.time.localeCompare(b.time));

    // 6. format header and lines
    const header = `${baseTime.format('HH:mm')} on ${baseTime.format('MMMM D')} in ${senderTz}`;

    const formattedTimes = results
      .map((r) => `• ${r.time} ${r.date} in ${r.place}`)
      .join('\n');

    // 7. send the response
    await respond({
      response_type: 'in_channel',
      text: `${header}\n\n${formattedTimes}`
    });

  } catch (err) {
    console.error("Error handling /tc:", err);
    await respond("Something went wrong while converting time.");
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Slack Bolt app is running on port 3000');
})();
