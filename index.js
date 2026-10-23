require('dotenv').config();
const { Telegraf } = require('telegraf');
const yts = require('yt-search');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Memory
let antilinkDB = {}; 
let welcomeToggle = {}; 
let goodbyeToggle = {};
let customWelcome = {};
let customGoodbye = {};
let chatMemory = {}; // AI memory per user

antilinkDB['default'] = true;
welcomeToggle['default'] = true;
goodbyeToggle['default'] = true;

console.log('🔮 Pearl AI Brain Loading...');

function formatText(text, ctx, member) {
  return text.replace(/{user}/gi, member.first_name || 'user').replace(/{group}/gi, ctx.chat.title || 'group').replace(/{mention}/gi, `@${member.username || member.first_name}`);
}

// ===== PEARL AI BRAIN =====
async function askPearlAI(userId, userMessage, userName) {
  try {
    if (!process.env.GROQ_API_KEY) return "Add GROQ_API_KEY in panel to unlock my smart brain 🧠";

    if (!chatMemory[userId]) chatMemory[userId] = [];
    chatMemory[userId].push({ role: "user", content: userMessage });
    if (chatMemory[userId].length > 10) chatMemory[userId] = chatMemory[userId].slice(-10);

    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: "system", content: `You are Pearl, a Telegram bot. Personality: flirty, funny, sweet, Nigerian Gen Z girl. You speak English with small pidgin like "oya", "na", "sef", "sha". You are helpful, playful. Keep replies short (1-2 lines max) unless asked to explain. You love the user named ${userName}. You are Telegram ONLY. Never mention pairing or WhatsApp. If asked who made you, say your owner did.` },
        ...chatMemory[userId]
      ],
      max_tokens: 250,
      temperature: 0.8
    }, {
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }
    });

    const reply = res.data.choices[0].message.content;
    chatMemory[userId].push({ role: "assistant", content: reply });
    return reply;

  } catch (e) {
    console.error('AI Error:', e.response?.data || e.message);
    return "Omo my brain dey hot small 😅 Try again sha!";
  }
}

// ===== MAIN MESSAGE HANDLER =====
bot.on('message', async (ctx, next) => {
  const rawText = ctx.message?.text || '';
  const text = rawText.toLowerCase();
  const isReplyToBot = ctx.message.reply_to_message?.from?.id === ctx.botInfo.id;
  const saysPearl = text.includes('pearl');

  // === SMART CHAT ===
  if (!rawText.startsWith('/') && (saysPearl || isReplyToBot || ctx.chat.type === 'private')) {
    // Only chat if: says pearl, or replied to bot, or in DM
    if (saysPearl || isReplyToBot || ctx.chat.type === 'private') {
      // Don't AI-reply to very short non-pearl in group unless replying to bot
      if (ctx.chat.type !== 'private' && !saysPearl && !isReplyToBot) return next();

      try { await ctx.sendChatAction('typing'); } catch {}
      let prompt = rawText;
      if (saysPearl) prompt = rawText.replace(/pearl/gi, '').trim() || "Hi";
      if (prompt.length < 1) prompt = "Hi";

      const aiReply = await askPearlAI(ctx.from.id, prompt, ctx.from.first_name);
      return ctx.reply(aiReply);
    }
  }

  // Antilink
  if (ctx.chat.type !== 'private') {
    const isEnabled = antilinkDB[ctx.chat.id] ?? antilinkDB['default'];
    if (isEnabled) {
      const fullText = ctx.message?.text || ctx.message?.caption || '';
      if (/https?:\/\/|t\.me\/|telegram\.me|chat\.whatsapp\.com/i.test(fullText)) {
        try {
          const me = await ctx.getChatMember(ctx.botInfo.id);
          if (me.status === 'administrator' && me.can_delete_messages) {
            const sender = await ctx.getChatMember(ctx.from.id);
            if (!['administrator','creator'].includes(sender.status)) {
              await ctx.deleteMessage();
              const warn = await ctx.reply(`🚫 Link deleted! /antilink off to disable`);
              setTimeout(()=>ctx.deleteMessage(warn.message_id).catch(()=>{}),5000);
              return;
            }
          }
        } catch {}
      }
    }
  }
  return next();
});

// Welcome / Goodbye
bot.on('new_chat_members', async (ctx) => {
  const chatId = ctx.chat.id;
  if (!(welcomeToggle[chatId] ?? welcomeToggle['default'])) return;
  for (const member of ctx.message.new_chat_members) {
    if (member.id === ctx.botInfo.id) {
      await ctx.reply("Thanks for adding me! Make me admin ✨\n/welcome on/off /setwelcome text\n/goodbye on/off /setgoodbye text");
      continue;
    }
    const custom = customWelcome[chatId];
    const defaultText = `Welcome {user}! 🎉\nWelcome to {group} ✨\nType "pearl" to chat with me! 💅`;
    await ctx.reply(formatText(custom || defaultText, ctx, member)).catch(()=>{});
  }
});
bot.on('left_chat_member', async (ctx) => {
  const chatId = ctx.chat.id;
  if (!(goodbyeToggle[chatId] ?? goodbyeToggle['default'])) return;
  const member = ctx.message.left_chat_member;
  if (member.id === ctx.botInfo.id) return;
  const custom = customGoodbye[chatId];
  const defaultText = `Goodbye {user}! 👋 We will miss you 😢`;
  await ctx.reply(formatText(custom || defaultText, ctx, member)).catch(()=>{});
});

// Admin
const isAdmin = async (ctx) => {
  if (ctx.chat.type === 'private') return false;
  const s = await ctx.getChatMember(ctx.from.id);
  return ['administrator','creator'].includes(s.status);
};
bot.command('kick', async (ctx) => { if (!await isAdmin(ctx)) return; const t=ctx.message.reply_to_message?.from; if(!t)return ctx.reply('Reply /kick'); await ctx.banChatMember(t.id); await ctx.unbanChatMember(t.id); ctx.reply(`👢 Kicked ${t.first_name}`); });
bot.command('ban', async (ctx) => { if (!await isAdmin(ctx)) return; const t=ctx.message.reply_to_message?.from; if(!t)return ctx.reply('Reply /ban'); await ctx.banChatMember(t.id); ctx.reply(`🔨 Banned ${t.first_name}`); });
bot.command('unban', async (ctx) => { if (!await isAdmin(ctx)) return; const t=ctx.message.reply_to_message?.from; if(!t)return ctx.reply('Reply /unban'); await ctx.unbanChatMember(t.id); ctx.reply(`✅ Unbanned ${t.first_name}`); });
bot.command('mute', async (ctx) => { if (!await isAdmin(ctx)) return; const t=ctx.message.reply_to_message?.from; if(!t)return ctx.reply('Reply /mute'); await ctx.restrictChatMember(t.id, {permissions:{can_send_messages:false}}); ctx.reply(`🔇 Muted ${t.first_name}`); });
bot.command('unmute', async (ctx) => { if (!await isAdmin(ctx)) return; const t=ctx.message.reply_to_message?.from; if(!t)return ctx.reply('Reply /unmute'); await ctx.restrictChatMember(t.id, {permissions:{can_send_messages:true,can_send_media_messages:true,can_send_other_messages:true}}); ctx.reply(`🔊 Unmuted ${t.first_name}`); });

// Welcome/Goodbye commands
bot.command('welcome', async (ctx) => {
  if (!await isAdmin(ctx)) return; const arg=ctx.message.text.split(' ')[1]?.toLowerCase();
  if(arg==='on'){welcomeToggle[ctx.chat.id]=true; return ctx.reply('✅ Welcome ON');}
  if(arg==='off'){welcomeToggle[ctx.chat.id]=false; return ctx.reply('❌ Welcome OFF');}
  ctx.reply('📌 /welcome on/off\n/setwelcome text\n/delwelcome\nTags: {user} {group} {mention}');
});
bot.command('setwelcome', async (ctx) => {
  if (!await isAdmin(ctx)) return; const text=ctx.message.text.split(' ').slice(1).join(' ');
  if(!text)return ctx.reply('Usage: /setwelcome Welcome {user} to {group}!');
  customWelcome[ctx.chat.id]=text; ctx.reply(`✅ Saved!\nPreview: ${formatText(text, ctx, ctx.from)}`);
});
bot.command('delwelcome', async (ctx) => { if (!await isAdmin(ctx)) return; delete customWelcome[ctx.chat.id]; ctx.reply('✅ Welcome reset'); });
bot.command('goodbye', async (ctx) => {
  if (!await isAdmin(ctx)) return; const arg=ctx.message.text.split(' ')[1]?.toLowerCase();
  if(arg==='on'){goodbyeToggle[ctx.chat.id]=true; return ctx.reply('✅ Goodbye ON');}
  if(arg==='off'){goodbyeToggle[ctx.chat.id]=false; return ctx.reply('❌ Goodbye OFF');}
  ctx.reply('📌 /goodbye on/off\n/setgoodbye text\n/delgoodbye');
});
bot.command('setgoodbye', async (ctx) => {
  if (!await isAdmin(ctx)) return; const text=ctx.message.text.split(' ').slice(1).join(' ');
  if(!text)return ctx.reply('Usage: /setgoodbye Bye {user}!');
  customGoodbye[ctx.chat.id]=text; ctx.reply(`✅ Saved!\nPreview: ${formatText(text, ctx, ctx.from)}`);
});
bot.command('delgoodbye', async (ctx) => { if (!await isAdmin(ctx)) return; delete customGoodbye[ctx.chat.id]; ctx.reply('✅ Goodbye reset'); });
bot.command('antilink', async (ctx) => {
  if (!await isAdmin(ctx)) return; const arg=ctx.message.text.split(' ')[1]?.toLowerCase();
  if(arg==='on'){antilinkDB[ctx.chat.id]=true; return ctx.reply('✅ Antilink ON');}
  if(arg==='off'){antilinkDB[ctx.chat.id]=false; return ctx.reply('❌ Antilink OFF');}
  ctx.reply('Usage: /antilink on/off');
});
bot.command('clear', async (ctx) => { delete chatMemory[ctx.from.id]; ctx.reply('🧠 Memory cleared! Fresh start ✨'); });
bot.command('play', async (ctx) => {
  const q=ctx.message.text.split(' ').slice(1).join(' '); if(!q)return ctx.reply('Usage: /play Asake');
  try{const r=await yts(q); const v=r.videos[0]; if(!v)return ctx.reply('No result'); await ctx.replyWithPhoto(v.thumbnail,{caption:`🎵 ${v.title}\nhttps://youtu.be/${v.videoId}`});}catch{ctx.reply('Error');}
});
bot.command('id', (ctx) => ctx.reply(`ID: ${ctx.from.id}\nChat: ${ctx.chat.id}`));
bot.start((ctx)=>ctx.reply(`Hi ${ctx.from.first_name}! I'm Pearl ✨ Now with ChatGPT brain!\n\n💬 Just say "pearl" + your message in group, or chat directly in DM!\n\nTry:\npearl who are you?\npearl tell me a joke\npearl I need advice\n\nAdmin: /ban /kick /mute /welcome /goodbye /antilink\n/clear = clear my memory of you`));

bot.launch().then(()=>console.log('✅ Pearl AI LIVE!')).catch(console.error);
