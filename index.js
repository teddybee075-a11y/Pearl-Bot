require('dotenv').config();
const { Telegraf } = require('telegraf');
const yts = require('yt-search');

const bot = new Telegraf(process.env.BOT_TOKEN);
console.log('🔮 Pearl Starting - Telegram Only');

// Anti-Link - deletes links if bot is admin
bot.on('message', async (ctx, next) => {
  if (ctx.chat.type === 'private') return next();
  const text = ctx.message?.text || ctx.message?.caption || '';
  if (!/https?:\/\/|t\.me\/|telegram\.me|chat\.whatsapp\.com/i.test(text)) return next();
  try {
    const me = await ctx.getChatMember(ctx.botInfo.id);
    if (me.status !== 'administrator' || !me.can_delete_messages) return next();
    const sender = await ctx.getChatMember(ctx.from.id);
    if (['administrator','creator'].includes(sender.status)) return next();
    await ctx.deleteMessage();
    const warn = await ctx.reply(`🚫 Link deleted - ${ctx.from.first_name}`);
    setTimeout(() => ctx.deleteMessage(warn.message_id).catch(()=>{}), 3000);
  } catch {}
  return next();
});

// Admin
bot.command('kick', async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply('Use in groups');
  const s = await ctx.getChatMember(ctx.from.id);
  if (!['administrator','creator'].includes(s.status)) return ctx.reply('Admins only');
  const t = ctx.message.reply_to_message?.from;
  if (!t) return ctx.reply('Reply to someone with /kick');
  await ctx.banChatMember(t.id); await ctx.unbanChatMember(t.id);
  ctx.reply(`👢 Kicked ${t.first_name}`);
});

bot.command('ban', async (ctx) => {
  if (ctx.chat.type === 'private') return;
  const s = await ctx.getChatMember(ctx.from.id);
  if (!['administrator','creator'].includes(s.status)) return ctx.reply('Admins only');
  const t = ctx.message.reply_to_message?.from;
  if (!t) return ctx.reply('Reply with /ban');
  await ctx.banChatMember(t.id); ctx.reply(`🔨 Banned ${t.first_name}`);
});

bot.command('unban', async (ctx) => {
  const s = await ctx.getChatMember(ctx.from.id);
  if (!['administrator','creator'].includes(s.status)) return;
  const t = ctx.message.reply_to_message?.from;
  if (!t) return ctx.reply('Reply with /unban');
  await ctx.unbanChatMember(t.id); ctx.reply(`✅ Unbanned ${t.first_name}`);
});

// Music / Games
bot.command('play', async (ctx) => {
  const q = ctx.message.text.split(' ').slice(1).join(' ');
  if (!q) return ctx.reply('Usage: /play Asake');
  const m = await ctx.reply(`🔍 Searching "${q}"...`);
  try {
    const r = await yts(q); const v = r.videos[0];
    if (!v) return ctx.reply('No result');
    await ctx.replyWithPhoto(v.thumbnail, { 
      caption: `🎵 *${v.title}*\n⏱ ${v.timestamp} | 👁 ${v.views}\n\n🔗 https://youtu.be/${v.videoId}`,
      parse_mode: 'Markdown'
    });
    ctx.deleteMessage(m.message_id).catch(()=>{});
  } catch(e){ ctx.reply('Error: ' + e.message); }
});

bot.command('dice', (ctx) => ctx.replyWithDice());
bot.command('darts', (ctx) => ctx.replyWithDice({ emoji: '🎯' }));
bot.command('basket', (ctx) => ctx.replyWithDice({ emoji: '🏀' }));
bot.command('slot', (ctx) => ctx.replyWithDice({ emoji: '🎰' }));
bot.command('game', (ctx) => ctx.reply('🎮 Pearl Games', {
  reply_markup: { inline_keyboard: [[{text:'🎲 Dice',callback_data:'g_dice'},{text:'🎯 Darts',callback_data:'g_darts'}],[{text:'🏀 Basket',callback_data:'g_basket'},{text:'🎰 Slot',callback_data:'g_slot'}]] }
}));

bot.on('callback_query', async (ctx) => {
  const map = { g_dice:'🎲', g_darts:'🎯', g_basket:'🏀', g_slot:'🎰' };
  if (map[ctx.callbackQuery.data]) {
    await ctx.replyWithDice({ emoji: map[ctx.callbackQuery.data] });
    await ctx.answerCbQuery();
  }
});

bot.command('id', (ctx) => ctx.reply(`Your ID: ${ctx.from.id}\nChat ID: ${ctx.chat.id}`));
bot.start((ctx) => ctx.reply(`Hi ${ctx.from.first_name}! I'm Pearl ✨\n\nTelegram Only Bot - No Pairing\n\nCommands:\n/ban /kick /unban (reply to user)\n/play song name\n/dice /darts /basket /slot /game\n/id - get IDs\n\nMake me admin to auto-delete links!`));

bot.launch().then(()=>console.log('✅ Pearl LIVE on Telegram!')).catch(console.error);
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
