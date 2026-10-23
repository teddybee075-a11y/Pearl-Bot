require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
let chatMemory = {};
let lastReply = {}; // prevent repeat

console.log('🔮 Pearl IRIS MODE Live');

// /id like IRIS does
bot.command('id', (ctx) => {
  return ctx.reply(`User\nID: ${ctx.from.id}\nUsername: @${ctx.from.username || 'none'}\nName: ${ctx.from.first_name}`);
});

async function askPearlAI(userId, message, name) {
  const hour = new Date().getHours();
  let timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  
  if (!chatMemory[userId]) chatMemory[userId] = [];
  chatMemory[userId].push({ role: "user", content: message });
  if (chatMemory[userId].length > 10) chatMemory[userId] = chatMemory[userId].slice(-10);

  // Avoid repeat - send last 2 bot replies to AI
  const avoid = lastReply[userId] ? `DO NOT repeat this: "${lastReply[userId]}". Be different!` : '';

  try {
    if (!process.env.GROQ_API_KEY) throw new Error('No key');
    
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: "system", content: `You are Pearl, a flirty Telegram girlfriend bot like IRIS. 
User name: ${name}. Current time: ${timeOfDay} (9am now in Nigeria). 
Rules:
- Keep replies 1 short sentence, max 12 words.
- Never repeat same greeting. Be varied.
- Know time: if user says "good morning" in afternoon, correct like "it's afternoon, ${name}" like IRIS does.
- Flirty, sweet, small pidgin.
- ${avoid}
- Ask a follow up question sometimes.` },
        ...chatMemory[userId]
      ],
      max_tokens: 80,
      temperature: 1.0
    }, { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } });

    const reply = res.data.choices[0].message.content.trim();
    chatMemory[userId].push({ role: "assistant", content: reply });
    lastReply[userId] = reply;
    return reply;

  } catch (e) {
    console.log('AI ERROR:', e.response?.data || e.message);
    // Smart fallback - NEVER repeats same as last
    const fallbacks = [
      `Hey ${name} 😏 what's good?`,
      `Oya ${name}, how you dey? 👀`,
      `Hehe hi ${name}, miss me? 😘`,
      `Wassup ${name}? You good? ✨`,
      `Hmm ${name} you quiet o 😏 wetin dey?`,
      `Heyy ${name}, how was your night? 🌙`,
      `Yo ${name}, gist me na 💅`
    ];
    let r;
    do { r = fallbacks[Math.floor(Math.random()*fallbacks.length)]; } while (r === lastReply[userId]);
    lastReply[userId] = r;
    chatMemory[userId].push({ role: "assistant", content: r });
    return r;
  }
}

async function textToVoice(text, ctx) {
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-audio&voice=nova`;
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    const fp = path.join('/tmp', `pearl_${Date.now()}.mp3`);
    fs.writeFileSync(fp, res.data);
    await ctx.sendVoice({ source: fp });
    fs.unlinkSync(fp);
    return true;
  } catch { return false; }
}

bot.on('message', async (ctx, next) => {
  if (!ctx.message?.text) return next();
  const raw = ctx.message.text;
  if (raw.startsWith('/')) return next();

  const isReply = ctx.message.reply_to_message?.from?.id === ctx.botInfo.id;
  const saysPearl = raw.toLowerCase().includes('pearl');
  const isDM = ctx.chat.type === 'private';
  
  // Chat like IRIS: DM = always chat, Group = only if says pearl or replies
  if (!isDM && !saysPearl && !isReply) return next();

  try { await ctx.sendChatAction('typing'); } catch {}
  let thinkMsg;
  try { thinkMsg = await ctx.reply('typing...'); } catch {}
  await new Promise(r=>setTimeout(r, 800));
  try { if (thinkMsg) await ctx.deleteMessage(thinkMsg.message_id); } catch {}

  let prompt = raw.replace(/pearl/gi, '').trim() || raw;
  const aiReply = await askPearlAI(ctx.from.id, prompt, ctx.from.first_name);

  // 35% voice like Miss Tyra, 65% text like IRIS
  if (Math.random() < 0.35) {
    try { await ctx.sendChatAction('record_voice'); } catch {}
    await new Promise(r=>setTimeout(r, 1000));
    const ok = await textToVoice(aiReply, ctx);
    if (!ok) await ctx.reply(aiReply);
  } else {
    await ctx.reply(aiReply);
  }
});

bot.command('clear', (ctx)=>{ delete chatMemory[ctx.from.id]; delete lastReply[ctx.from.id]; ctx.reply('🧠 Cleared!'); });
bot.start((ctx)=>ctx.reply(`Hi ${ctx.from.first_name}! I'm Pearl ✨ Now like IRIS, no more repeat!\n\nTry /id or just say Hi`));
bot.launch().then(()=>console.log('✅ Pearl IRIS CLONE LIVE'));
