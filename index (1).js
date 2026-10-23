require('dotenv').config();
const { Telegraf } = require('telegraf');
const yts = require('yt-search');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);

let antilinkDB = {}; 
let welcomeToggle = {}; 
let goodbyeToggle = {};
let customWelcome = {};
let customGoodbye = {};

antilinkDB['default'] = true;
welcomeToggle['default'] = true;
goodbyeToggle['default'] = true;

console.log('🔮 Pearl - Welcome/Goodbye Custom Edition');

// Format custom text
function formatText(text, ctx, member) {
  return text
    .replace(/{user}/gi, member.first_name || 'user')
    .replace(/{group}/gi, ctx.chat.title || 'group')
    .replace(/{mention}/gi, `@${member.username || member.first_name}`);
}

// ===== AUTO CHAT "pearl" =====
const pearlReplies = ["Yes baby? You called me? 😏","I'm here darling ✨","Pearl at your service 😌","You summoned me? 😎","Oya now, I'm listening 👂","Hehe, I heard my name 👀","My love called me? 🥰","Sup? Need something? 💅"];
bot.on('message', async (ctx, next) => {
  const text = (ctx.message?.text || '').toLowerCase();
  if (text.includes('pearl') && !text.startsWith('/')) {
    const isReplyToBot = ctx.message.reply_to_message?.from?.id === ctx.botInfo.id;
    if (text.includes('pearl') || isReplyToBot) {
       if (text.includes('how are you')) return ctx.reply("I'm fine darling ✨ You?");
       if (text.includes('who are you')) return ctx.reply("I'm Pearl — your Telegram queen 👑");
       if (text.includes('i love you')) return ctx.reply("Aww love you too 😘");
       if (ctx.chat.type === 'private' || text.length < 25 || isReplyToBot || Math.random() > 0.6) {
         return ctx.reply(pearlReplies[Math.floor(Math.random() * pearlReplies.length)]);
       }
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

// ===== WELCOME =====
bot.on('new_chat_members', async (ctx) => {
  const chatId = ctx.chat.id;
  if (!(welcomeToggle[chatId] ?? welcomeToggle['default'])) return;
  for (const member of ctx.message.new_chat_members) {
    if (member.id === ctx.botInfo.id) {
      await ctx.reply("Thanks for adding me! Make me admin ✨\n/welcome on/off\n/setwelcome text\n/goodbye on/off\n/setgoodbye text");
      continue;
    }
    const custom = customWelcome[chatId];
    const defaultText = `Welcome {user}! 🎉\n\nWelcome to {group} ✨\nType "pearl" to chat with me! 💅`;
    const finalText = formatText(custom || defaultText, ctx, member);
    await ctx.reply(finalText).catch(()=>{});
  }
});

// ===== GOODBYE =====
bot.on('left_chat_member', async (ctx) => {
  const chatId = ctx.chat.id;
  if (!(goodbyeToggle[chatId] ?? goodbyeToggle['default'])) return;
  const member = ctx.message.left_chat_member;
  if (member.id === ctx.botInfo.id) return;
  const custom = customGoodbye[chatId];
  const defaultText = `Goodbye {user}! 👋\nWe will miss you 😢`;
  const finalText = formatText(custom || defaultText, ctx, member);
  await ctx.reply(finalText).catch(()=>{});
});

// ===== ADMIN CHECK =====
const isAdmin = async (ctx) => {
  if (ctx.chat.type === 'private') return false;
  const s = await ctx.getChatMember(ctx.from.id);
  return ['administrator','creator'].includes(s.status);
};

// Admin actions
bot.command('kick', async (ctx) => { if (!await isAdmin(ctx)) return; const t=ctx.message.reply_to_message?.from; if(!t)return ctx.reply('Reply /kick'); await ctx.banChatMember(t.id); await ctx.unbanChatMember(t.id); ctx.reply(`👢 Kicked ${t.first_name}`); });
bot.command('ban', async (ctx) => { if (!await isAdmin(ctx)) return; const t=ctx.message.reply_to_message?.from; if(!t)return ctx.reply('Reply /ban'); await ctx.banChatMember(t.id); ctx.reply(`🔨 Banned ${t.first_name}`); });
bot.command('unban', async (ctx) => { if (!await isAdmin(ctx)) return; const t=ctx.message.reply_to_message?.from; if(!t)return ctx.reply('Reply /unban'); await ctx.unbanChatMember(t.id); ctx.reply(`✅ Unbanned ${t.first_name}`); });
bot.command('mute', async (ctx) => { if (!await isAdmin(ctx)) return; const t=ctx.message.reply_to_message?.from; if(!t)return ctx.reply('Reply /mute'); await ctx.restrictChatMember(t.id, {permissions:{can_send_messages:false}}); ctx.reply(`🔇 Muted ${t.first_name}`); });
bot.command('unmute', async (ctx) => { if (!await isAdmin(ctx)) return; const t=ctx.message.reply_to_message?.from; if(!t)return ctx.reply('Reply /unmute'); await ctx.restrictChatMember(t.id, {permissions:{can_send_messages:true,can_send_media_messages:true,can_send_other_messages:true}}); ctx.reply(`🔊 Unmuted ${t.first_name}`); });

// ===== WELCOME COMMANDS =====
bot.command('welcome', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Admins only');
  const arg = ctx.message.text.split(' ')[1]?.toLowerCase();
  if (arg === 'on') { welcomeToggle[ctx.chat.id] = true; return ctx.reply('✅ Welcome ON'); }
  if (arg === 'off') { welcomeToggle[ctx.chat.id] = false; return ctx.reply('❌ Welcome OFF'); }
  ctx.reply('📌 Welcome Commands:\n/welcome on/off\n/setwelcome your text\n/delwelcome\n\nYou can use:\n{user} = name\n{group} = group name\n{mention} = @username\n\nExample:\n/setwelcome Welcome {user} to {group}! 🎉');
});
bot.command('setwelcome', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  const text = ctx.message.text.split(' ').slice(1).join(' ');
  if (!text) return ctx.reply('Usage: /setwelcome Welcome {user} to {group}!\n\nTags: {user}, {group}, {mention}');
  customWelcome[ctx.chat.id] = text;
  ctx.reply(`✅ Custom welcome saved!\n\nPreview:\n${formatText(text, ctx, ctx.from)}\n\nUse /delwelcome to reset`);
});
bot.command('delwelcome', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  delete customWelcome[ctx.chat.id];
  ctx.reply('✅ Welcome reset to default:\nWelcome {user}! 🎉 Welcome to {group} ✨');
});

// ===== GOODBYE COMMANDS =====
bot.command('goodbye', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Admins only');
  const arg = ctx.message.text.split(' ')[1]?.toLowerCase();
  if (arg === 'on') { goodbyeToggle[ctx.chat.id] = true; return ctx.reply('✅ Goodbye ON'); }
  if (arg === 'off') { goodbyeToggle[ctx.chat.id] = false; return ctx.reply('❌ Goodbye OFF'); }
  ctx.reply('📌 Goodbye Commands:\n/goodbye on/off\n/setgoodbye your text\n/delgoodbye\n\nTags: {user}, {group}, {mention}\nExample:\n/setgoodbye Bye {user} 👋');
});
bot.command('setgoodbye', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  const text = ctx.message.text.split(' ').slice(1).join(' ');
  if (!text) return ctx.reply('Usage: /setgoodbye Goodbye {user}! 👋');
  customGoodbye[ctx.chat.id] = text;
  ctx.reply(`✅ Custom goodbye saved!\n\nPreview:\n${formatText(text, ctx, ctx.from)}`);
});
bot.command('delgoodbye', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  delete customGoodbye[ctx.chat.id];
  ctx.reply('✅ Goodbye reset to default');
});

// Others
bot.command('antilink', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  const arg = ctx.message.text.split(' ')[1]?.toLowerCase();
  if (arg==='on'){antilinkDB[ctx.chat.id]=true; return ctx.reply('✅ Antilink ON');}
  if (arg==='off'){antilinkDB[ctx.chat.id]=false; return ctx.reply('❌ Antilink OFF');}
  ctx.reply('Usage: /antilink on/off');
});
bot.command('play', async (ctx) => {
  const q = ctx.message.text.split(' ').slice(1).join(' ');
  if (!q) return ctx.reply('Usage: /play Asake');
  try { const r=await yts(q); const v=r.videos[0]; if(!v)return ctx.reply('No result'); await ctx.replyWithPhoto(v.thumbnail,{caption:`🎵 ${v.title}\nhttps://youtu.be/${v.videoId}`}); } catch{ctx.reply('Error');}
});
bot.command('poll', async (ctx) => {
  const args=ctx.message.text.split('|'); if(args.length<3)return ctx.reply('Usage: /poll Q | Opt1 | Opt2'); 
  await ctx.replyWithPoll(args[0].replace('/poll','').trim(), args.slice(1).map(o=>o.trim()), {is_anonymous:false});
});
bot.command('dice', (ctx) => ctx.replyWithDice());
bot.command('id', (ctx) => ctx.reply(`ID: ${ctx.from.id}\nChat: ${ctx.chat.id}`));
bot.start((ctx)=>ctx.reply(`Hi ${ctx.from.first_name}! I'm Pearl ✨\n\n💬 Say "pearl" to chat!\n\nWelcome:\n/welcome on/off\n/setwelcome text\n/delwelcome\n\nGoodbye:\n/goodbye on/off\n/setgoodbye text\n/delgoodbye\n\nTags: {user} {group} {mention}`));

bot.launch().then(()=>console.log('✅ Pearl Welcome/Goodbye LIVE')).catch(console.error);
   
