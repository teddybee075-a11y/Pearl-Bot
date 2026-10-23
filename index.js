require('dotenv').config();
const { Telegraf } = require('telegraf');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);
const AI_URL = process.env.AI_URL || "https://api.openai.com/v1/chat/completions";
const AI_KEY = process.env.AI_KEY;

// Prevent crash
bot.catch((err, ctx) => {
  console.log("Caught error for", ctx.updateType, err.message);
});

const userNames = new Map();

function getName(ctx) {
  return userNames.get(ctx.from.id) || ctx.from.first_name;
}

async function askPearl(prompt, userName) {
  try {
    // Replace this with your actual AI call
    const res = await require('axios').post(AI_URL, {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `You are Pearl, a flirty Nigerian queen. User is called ${userName}. Keep it short, savage, Pidgin mixed.` },
        { role: "user", content: prompt }
      ]
    }, { headers: { Authorization: `Bearer ${AI_KEY}` }});
    return res.data.choices[0].message.content;
  } catch (e) {
    console.log("AI error", e.message);
    return "My brain dey do anyhow, Zaddy. Talk to me again? 😅";
  }
}

bot.start((ctx) => ctx.reply(`Hey ${getName(ctx)} 😘 I'm Pearl, I'm live.`));

bot.hears(/call me (.+)/i, (ctx) => {
  const name = ctx.match[1].trim();
  userNames.set(ctx.from.id, name);
  ctx.reply(`Done 😘 I'll now call you °•${name}•° forever. Unless you change am again sha.`, { reply_to_message_id: ctx.message.message_id });
});

bot.hears(/play (.+)/i, async (ctx) => {
  const query = ctx.match[1];
  const msgId = ctx.message.message_id;
  // prevent double trigger
  if (ctx.state.processing) return;
  ctx.state.processing = true;

  try {
    await ctx.reply(`🎧 Got it — ${query} downloading...`, { reply_to_message_id: msgId });
    const search = await yts(query);
    if (!search.videos.length) return ctx.reply("I no see am o, try another name", { reply_to_message_id: msgId });
    
    const video = search.videos[0];
    const stream = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' });
    const file = `/tmp/${Date.now()}.mp3`;
    const write = fs.createWriteStream(file);
    stream.pipe(write);
    
    await new Promise((res, rej) => {
      write.on('finish', res);
      write.on('error', rej);
    });

    await ctx.replyWithAudio({ source: file }, { title: video.title, reply_to_message_id: msgId });
    fs.unlinkSync(file);
  } catch (e) {
    console.log("Music error:", e.message);
    await ctx.reply(`Omo, ${query} no gree download. Send me link directly? 😢`, { reply_to_message_id: msgId }).catch(()=>{});
  }
});

// THIS IS THE IMPORTANT PART FOR GROUP TAGGING
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text;
  if (!text) return;
  if (text.startsWith('/')) return next(); // let commands pass
  
  // In groups: only reply if she is mentioned, replied to, or name "pearl" is called
  if (ctx.chat.type !== 'private') {
    const isReplyToBot = ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo.id;
    const mentionsBot = text.toLowerCase().includes('pearl') || text.includes(`@${ctx.botInfo.username}`);
    if (!isReplyToBot && !mentionsBot) return;
  }

  try {
    if (text.toLowerCase() === 'pearl' && ctx.message.text.length < 10) {
      return await ctx.reply(`Yes ${getName(ctx)}? You called me? 👀`, { reply_to_message_id: ctx.message.message_id });
    }

    const replyText = await askPearl(text, getName(ctx));
    if (!replyText || replyText.trim() === "") return;
    
    await ctx.reply(replyText, { reply_to_message_id: ctx.message.message_id });
  } catch (e) {
    console.log("Text handler error", e.message);
  }
});

bot.launch().then(() => console.log("💜 Pearl FINAL ULTIMATE Live"));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
