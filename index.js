const { App } = require('@slack/bolt');
const chrono = require('chrono-node');
const moment = require('moment-timezone');
require('dotenv').config();

// Helper: turn IANA tz like "Europe/Berlin" → "Berlin"
function getPlaceName(tz) {
  const parts = tz.split('/');
  const raw = parts[1] || parts[0];
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
    const { user } = await client.users.info({ user: command.user_id });
    const senderTz = user?.tz || 'UTC';

    const referenceDate = moment().tz(senderTz).toDate();
    console.log(`✏️ senderTz = ${senderTz}`);
    console.log(`✏️ referenceDate (user now) = ${referenceDate.toISOString()}`);

    // 3. parse the input relative to that reference
    const parsed = chrono.parseDate(command.text, referenceDate);
    console.log(`✏️ parsed result = ${parsed && parsed.toISOString()}`);
    if (!parsed) {
      await respond("Could not parse that time.");
      return;
    }

    const baseTime = moment.tz(parsed, senderTz);
    console.log(`✏️ baseTime in senderTz = ${baseTime.format('YYYY-MM-DDTHH:mm:ssZ')}`);

    // 4. fetch channel members
    const membersRes = await client.conversations.members({ channel: command.channel_id });
    const userIds = membersRes.members.filter(id => !id.startsWith('B')); // skip bots

    // 5. collect unique timezones
    const tzSet = new Set();
    for (const uid of userIds) {
      const { user: u } = await client.users.info({ user: uid });
      if (u?.tz) tzSet.add(u.tz);
    }

    // 6. convert for each timezone
    const results = [...tzSet]
      .map(tz => {
        const c = baseTime.clone().tz(tz);
        return {
          time: c.format('HH:mm'),
          date: c.format('MMMM D'),
          place: getPlaceName(tz)
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));

    // 7. format and respond
    const header = `${baseTime.format('HH:mm')} on ${baseTime.format('MMMM D')} in ${senderTz}`;
    const lines = results.map(r => `• ${r.time} ${r.date} in ${r.place}`).join('\n');

    await respond({
      response_type: 'in_channel',
      text: `${header}\n\n${lines}`
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
