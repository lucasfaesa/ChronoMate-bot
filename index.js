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
    // 1. get sender’s tz
    const { user } = await client.users.info({ user: command.user_id });
    const senderTz = user?.tz || 'UTC';
    //console.log('✏️ senderTz =', senderTz);

    // 2. build a reference “now” in sender’s tz
    const referenceDate = moment().tz(senderTz).toDate();
    //console.log('✏️ referenceDate (user now) =', referenceDate.toISOString());

    // 3. parse the input relative to that
    let parsed = chrono.parseDate(command.text, referenceDate);
    //console.log('✏️ chrono.parseDate result =', parsed && parsed.toISOString());
    if (!parsed) {
      await respond("Could not parse that time.");
      return;
    }

    // 3.1 fix Chrono’s UTC bias by shifting by the user’s offset
    const senderOffset = moment(parsed).tz(senderTz).utcOffset(); // in minutes
    //console.log('✏️ senderOffset (minutes) =', senderOffset);
    const correctedTs = parsed.getTime() + (-senderOffset * 60_000);
    parsed = new Date(correctedTs);
    //console.log('✏️ corrected parsed result =', parsed.toISOString());

    // 4. create the base moment in sender’s tz
    const baseTime = moment.tz(parsed, senderTz);
    //console.log('✏️ baseTime in senderTz =', baseTime.format('YYYY-MM-DDTHH:mm:ssZ'));

    // 5. fetch members & collect unique zones
    const membersRes = await client.conversations.members({ channel: command.channel_id });
    const userIds = membersRes.members.filter(id => !id.startsWith('B'));
    const tzSet = new Set();
    for (const uid of userIds) {
      const { user: u } = await client.users.info({ user: uid });
      if (u?.tz) tzSet.add(u.tz);
    }

    // 6. convert to each zone
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

    // 7. format & reply
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
