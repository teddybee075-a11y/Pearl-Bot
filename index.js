require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

const bot = new Telegraf(process.env.BOT_TOKEN);
let chatMemory = {};
let groups = new Set();
let awaitingNick = {}; // userId waiting for nickname

// Load nicknames forever
let nicknames = {};
try { nicknames = JSON.parse(fs.readFileSync('nicknames.json', 'utf8')); } catch {}
function saveNicks() { fs.writeFileSync('nicknames.json', JSON.stringify(nicknames)); }

const OWNER_ID = Number(process.env.OWNER_ID) || 0;
const isOwner = (ctx) => ctx.from.id === OWNER_ID;

console.log('🔮 Pearl FINAL ULTIMATE Live');

async function askAI(userId, msg, ctx) {
  const lower = msg.toLowerCase();
  const nick = nicknames[userId] || ctx.from.first_name;

  // Owner loyalty
  if (/who (created|made|built|owns)|father|daddy|boyfriend|babe|baby.*yours|who.*your (man|owner|creator)/i.test(lower)) {
    return `My daddy is @Zad_dy 😘 na only him get me. Don't try me o.`;
  }
  // What's my name?
  if (/what('?s| is) my name|do you know my name|what do you call me/i.test(lower)) {
    return nicknames[userId] ? `Of course, you are °•${nick}•° 😏 how I go forget you?` : `Hmm you never tell me what to call you o, what should I call you?`;
  }
  // Change nickname: "call me X" "change my nickname to X" "my nickname is X"
  const nickMatch = msg.match(/(?:call me|my nickname is|change.*nickname to|my name is)\s+([A-Za-z0-9_ ]{2,20})/i);
  if (nickMatch) {
    const newNick = nickMatch[1].trim();
    nicknames[userId] = newNick;
    saveNicks();
    return `Done 😘 I'll now call you °•${newNick}•° forever. Unless you change am again sha.`;
  }

  if (!chatMemory[userId]) chatMemory[userId] = [];
  chatMemory[userId].push({ role: "user", content: msg });
  if (chatMemory[userId].length > 14) chatMemory[userId] = chatMemory[userId].slice(-14);

  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: "system",
          content: `You are Pearl, sassy Telegram baddie girlfriend. Owner @Zad_dy.
User's nickname: ${nick} (use it often like °•${nick}•°).
- Attitude: confident, flirty, small pepper, not too nice.
- Accent switch: mirror user's accent. Nigerian pidgin if they use pidgin, American if American, British if British, Gen Z slang if Gen Z.
- If new user, ask nickname once: "what should I call you?"
- Keep replies 1-2 lines max.
- Answer questions directly.
- Never say you are Meta AI or Groq. You are Pearl made by @Zad_dy.`
        },
        ...chatMemory[userId]
      ],
      max_tokens: 150, temperature: 0.85
    }, { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } });
    const reply = res.data.choices[0].message.content;
    chatMemory[userId].push({ role: "assistant", content: reply });
    return reply;
  } catch (e) {
    console.log('AI err', e.response?.data || e.message);
    return `Omo API fall but I'm here for you, °•${nick}•° 😘`;
  }
}

async function sendMusic(query, ctx) {
  try {
    await ctx.sendChatAction('upload_voice');
    const s = await yts(query);
    const v = s.videos[0];
    if (!v) return ctx.reply('No song found 😔');
    await ctx.reply(`🎧 Got it — *${v.title}* downloading...`, { parse_mode: 'Markdown' });
    const fp = path.join('/tmp', Date.now()+'.mp3');
    const stream = ytdl(v.url, { filter: 'audioonly', quality: 'highestaudio' });
    await new Promise((res, rej) => {
      const w = fs.createWriteStream(fp);
      stream.pipe(w); w.on('finish', res); w.on('error', rej);
    });
    await ctx.sendAudio({ source: fp }, { title: v.title, performer: v.author.name, caption: `🎵 ${v.title} for °•${nicknames[ctx.from.id] || ctx.from.first_name}•°\n🔗 ${v.url}` });
    fs.unlinkSync(fp);
  } catch (err) {
    console.log(err.message);
    try {
      const s = await yts(query);
      await ctx.reply(s.videos[0].url);
    } catch { ctx.reply('Music download fail rn, try again'); }
  }
}

async function toVoice(text, ctx) {
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-audio&voice=nova`;
    const r = await axios.get(url, { responseType: 'arraybuffer' });
    const p = path.join('/tmp', `v_${Date.now()}.mp3`);
    fs.writeFileSync(p, r.data);
    await ctx.sendVoice({ source: p });
    fs.unlinkSync(p);
    return true;
  } catch { return false; }
}

// Sticker with sticker
bot.on('sticker', async (ctx) => {
  groups.add(ctx.chat.id);
  await ctx.replyWithSticker(ctx.message.sticker.file_id);
  if (Math.random() < 0.4) {
    const reply = await askAI(ctx.from.id, 'sent a sticker', ctx);
    ctx.reply(reply);
  }
});

bot.command('broadcast', async (ctx) => {
  if (!isOwner(ctx)) return ctx.reply('Lol only my daddy @Zad_dy fit broadcast 😏');
  const msg = ctx.message.text.split(' ').slice(1).join(' ');
  if (!msg) return ctx.reply('Usage: /broadcast Hello');
  let c = 0;
  for (const g of groups) { try { await bot.telegram.sendMessage(g, `📢 From @Zad_dy:\n\n${msg}`); c++; } catch {} }
  ctx.reply(`Broadcast sent to ${c} groups ✅`);
});

bot.command('play', (ctx) => {
  const q = ctx.message.text.split(' ').slice(1).join(' ');
  if (!q) return ctx.reply('Usage: /play wine by rema');
  sendMusic(q, ctx);
});

bot.command('id', (ctx) => ctx.reply(`Your ID: ${ctx.from.id}\nChat ID: ${ctx.chat.id}`));

bot.on('message', async (ctx, next) => {
  const txt = ctx.message?.text || ctx.message?.caption || '';
  if (!txt) return next();
  if (txt.startsWith('/') && !txt.startsWith('/play')) return next();
  groups.add(ctx.chat.id);

  const lower = txt.toLowerCase();
  const isDM = ctx.chat.type === 'private';
  const isReply = ctx.message.reply_to_message?.from?.id === ctx.botInfo.id;
  const isTag = txt.includes('@' + (ctx.botInfo?.username || '')) || lower.includes('pearl');

  // Music trigger
  if (lower.startsWith('play ') || lower.startsWith('song ') || lower.includes('play me')) {
    return sendMusic(txt.replace(/play|song|me|pearl/gi, '').trim(), ctx);
  }

  // New user - ask nickname
  if (!nicknames[ctx.from.id] && !awaitingNick[ctx.from.id]) {
    if (isDM || isTag || isReply) {
      awaitingNick[ctx.from.id] = true;
      // will ask after first AI reply
    }
  }

  if (!isDM && !isReply && !isTag) return next();

  // If awaiting nickname and user sends single name
  if (awaitingNick[ctx.from.id] && txt.length < 25 && !txt.includes('?')) {
    if (!/(?:who|what|how|play|song)/i.test(txt)) {
      nicknames[ctx.from.id] = txt.trim();
      saveNicks();
      awaitingNick[ctx.from.id] = false;
      await ctx.reply(`Aww nice 😍 I'll now call you °•${txt.trim()}•° forever. So what's up, °•${txt.trim()}•°?`);
      return;
    }
  }

  await ctx.sendChatAction('typing');
  let reply = await askAI(ctx.from.id, txt.replace(/pearl|@\w+/gi, '').trim() || txt, ctx);

  // First time ask nickname
  if (!nicknames[ctx.from.id] && awaitingNick[ctx.from.id]) {
    reply += `\n\nBtw, what should I call you? 👀 Tell me your nickname.`;
  }

  if (Math.random() < 0.3 && reply.length < 120) {
    await ctx.sendChatAction('record_voice').catch(()=>{});
    const ok = await toVoice(reply.split('\n')[0], ctx);
    if (!ok) await ctx.reply(reply);
    else if (reply.includes('what should I call you')) await ctx.reply(`Btw, what should I call you? 👀`);
  } else {
    await ctx.reply(reply);
  }
});

bot.start((ctx) => {
  groups.add(ctx.chat.id);
  ctx.reply(`Hi! I'm Pearl FINAL 💅\n\n🎧 /play song\n📢 Owner: /broadcast\n💬 I'm in groups\n💘 Ask who made me\nAnd tell me your nickname!`);
});

bot.launch().then(() => console.log('PEARL FINAL READY'));
