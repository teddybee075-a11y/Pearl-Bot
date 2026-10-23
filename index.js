require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
let chatMemory = {};

console.log('Pearl REAL AI starting...');

bot.command('id', (ctx) => ctx.reply(`ID: ${ctx.from.id}\nUsername: @${ctx.from.username || 'none'}`));

async function askAI(userId, userMsg, name) {
  if (!chatMemory[userId]) chatMemory[userId] = [];
  chatMemory[userId].push({ role: "user", content: userMsg });
  if (chatMemory[userId].length > 12) chatMemory[userId] = chatMemory[userId].slice(-12);

  const time = new Date().toLocaleString('en-NG', { hour: 'numeric', minute: 'numeric', hour12: true });

  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: "system",
          content: `You are Pearl, a Telegram bot girlfriend.
- User's name is ${name}, call him ${name} sometimes with fancy font like °•${name}•°.
- Current time is ${time}
- Personality: flirty, sweet, funny Nigerian girl, use small pidgin but speak clear English.
- MOST IMPORTANT: Answer the user's question directly. Don't give random greeting. If asked "what's your name?" say "I'm Pearl". If asked "how are you?" say how you are. Have real conversation like ChatGPT.
- Keep replies short: 1-2 sentences max.
- Never repeat same reply.`
        },
        ...chatMemory[userId]
      ],
      max_tokens: 150,
      temperature: 0.7
    }, {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }
    });

    const reply = res.data.choices[0].message.content;
    chatMemory[userId].push({ role: "assistant", content: reply });
    return reply;

  } catch (e) {
    console.log('GROQ ERROR:', e.response?.data || e.message);
    return `Groq error: ${e.response?.data?.error?.message || e.message} - Add valid GROQ_API_KEY in panel!`;
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

bot.on('message', async (ctx, next) => {
  const txt = ctx.message?.text;
  if (!txt || txt.startsWith('/')) return next();
  
  // DM or reply to bot or says pearl = chat
  const isDM = ctx.chat.type === 'private';
  const isReply = ctx.message.reply_to_message?.from?.id === ctx.botInfo.id;
  const saysPearl = txt.toLowerCase().includes('pearl');
  if (!isDM && !isReply && !saysPearl) return next();

  try { await ctx.sendChatAction('typing'); } catch {}
  await new Promise(r => setTimeout(r, 600));

  const prompt = txt.replace(/pearl/gi, '').trim() || txt;
  const reply = await askAI(ctx.from.id, prompt, ctx.from.first_name);

  // 30% voice, 70% text - like Miss Tyra
  if (Math.random() < 0.3 && reply.length < 100) {
    try { await ctx.sendChatAction('record_voice'); } catch {}
    await new Promise(r => setTimeout(r, 800));
    const ok = await toVoice(reply, ctx);
    if (!ok) await ctx.reply(reply);
  } else {
    await ctx.reply(reply);
  }
});

bot.start((ctx) => ctx.reply(`Hi ${ctx.from.first_name}! I'm Pearl now with real AI brain ✨\nAsk me anything!`));
bot.launch().then(() => console.log('✅ Pearl REAL AI LIVE')).catch(console.error);
