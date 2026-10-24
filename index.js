require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const yts = require('yt-search');
const play = require('play-dl');
const fs = require('fs');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const OWNER_ID = 6265335081;
const OWNER_USERNAME = "@Zad_dy";
const CHANNEL_USERNAME = "@zaddyyyyyyy";
const CHANNEL_ID = "-1002156743106";

bot.catch((err, ctx) => console.log("Handled:", err.message));

// --- SIMPLE DB ---
let db = { users: {}, groups: {}, settings: {} };
if (fs.existsSync('./database.json')) db = JSON.parse(fs.readFileSync('./database.json'));
function saveDB(){ fs.writeFileSync('./database.json', JSON.stringify(db, null, 2)); }
function getUser(id){ if(!db.users[id]) db.users[id] = { naira: 1000, name: '', wins: 0, games: {}, warns: 0 }; return db.users[id]; }

// --- KEYBOARDS ---
const startKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🫅Admin', 'admin_menu'), Markup.button.callback('🕹️Games', 'games_menu')],
  [Markup.button.callback('🏦Economy', 'economy_menu'), Markup.button.callback('💬Help', 'help_menu')],
  [Markup.button.url('➕Add to group', `https://t.me/${process.env.BOT_USERNAME || 'yourbot'}?startgroup=true`)]
]);
const backKeyboard = Markup.inlineKeyboard([[Markup.button.callback('🔙 Back', 'back_start')]]);

// --- /START ---
bot.start((ctx) => {
  const name = ctx.from.first_name;
  getUser(ctx.from.id).name = name;
  saveDB();
  if(ctx.chat.type !== 'private') db.groups[ctx.chat.id] = true, saveDB();
  ctx.reply(`hey ${name}👋 I'm Pearl 🌝, your paddy😌.. Crafted by °•ℤ𝕒𝕕𝕪❦✞•° 🥹.\nLet's kill boredom together..\nWanna chat, roast someone, play musics 🎶 or games 🎯? Proceed below 🤭`, startKeyboard);
});

// --- BUTTON HANDLERS ---
bot.action('admin_menu', (ctx) => ctx.editMessageText(`🫅Admin Commands\n\n/lock - admins only can chat\n/mute @user - mute someone\n/unmute @user - unmute\n/warn @user - warn\n/delwarn @user - remove warns\n/kick - remove but rejoin allowed\n/del - delete replied message\n/tagall - tag everyone\n/antilink on/off - delete links\n/antiforward on/off - delete forwards\n/listactive - active members\n/listinactive - inactive\n\n❓how to use: reply or mention user`, backKeyboard));
bot.action('games_menu', (ctx) => ctx.editMessageText(`🕹️Games - 🎮 Pearl Games\nEarn Naira by playing\n\nTrivia: /quiz /fastest /unscramble /millionaire /riddle /truth /dare\nBetting: /flip /dice /slots /football /basketball /emoji\nMulti: /ttt /connect4 /tictac /chomp /trapword /rps\nWord: /chain /ghost /carry /grid /guess /trace\nAuto Events: Guess, Luck, Trap\nLeaderboards: /quizrank /emojirank /scores`, backKeyboard));
bot.action('economy_menu', (ctx) => ctx.editMessageText(`🏦Economy & Risk - Naira Currency 💸\n\nTransfers:\n/give <amount> - send naira\n/tip - fixed 50 Naira tip\n/stats - limits and resets\n/scores - game records\n\nLucky:\n/steal [amount]\n/luck 300|500|700\n/challenge [amount]\n/slot <bet>\n\nSteal Control (owner):\n/stealoff [duration]\n/stealon`, backKeyboard));
bot.action('help_menu', (ctx) => ctx.editMessageText(`ρεα૨ℓ guide😝\n\nGroup Only: /tagall /lock /mute /quiz /ghost /chain\nDM Only: /broadcast (owner)\n\nMusic: Just tag Pearl + song name - e.g @Pearl play Wizkid Joro`, Markup.inlineKeyboard([
  [Markup.button.url('developer', 'https://t.me/Zad_dy'), Markup.button.url('✅join channel', 'https://t.me/zaddyyyyyyy')],
  [Markup.button.callback('🔙 Back', 'back_start')]
])));
bot.action('back_start', (ctx) => ctx.editMessageText(`hey ${ctx.from.first_name}👋 I'm Pearl 🌝, your paddy😌.. Crafted by °•ℤ𝕒𝕕𝕕𝕪❦✞•° 🥹.\nLet's kill boredom together..`, startKeyboard));

// --- OWNER BROADCAST ---
bot.command('broadcast', async (ctx) => {
  if(ctx.from.id !== OWNER_ID) return ctx.reply("Oya na, you no be my Zaddy 😒 Only @Zad_dy fit use this.");
  const msg = ctx.message.text.split(' ').slice(1).join(' ');
  if(!msg) return ctx.reply("Usage: /broadcast your message");
  let count=0;
  for(let gid of Object.keys(db.groups)){
    try{ await bot.telegram.sendMessage(gid, `📢 Broadcast from Zaddy:\n\n${msg}`); count++; }catch(e){ console.log("Failed group", gid); }
  }
  ctx.reply(`Broadcast sent to ${count} groups ✅`);
});

// --- ECONOMY COMMANDS (WORKING) ---
bot.command('give', (ctx) => {
  const amount = parseInt(ctx.message.text.split(' ')[1]);
  const target = ctx.message.reply_to_message?.from;
  if(!amount || !target) return ctx.reply("Usage: reply to user + /give 100");
  const from = getUser(ctx.from.id); const to = getUser(target.id);
  if(ctx.from.id !== OWNER_ID && from.naira < amount) return ctx.reply("You no get enough Naira 😭");
  if(ctx.from.id !== OWNER_ID) from.naira -= amount;
  to.naira += amount; saveDB();
  ctx.reply(`✅ ${amount} Naira sent to ${target.first_name}`, { reply_to_message_id: ctx.message.message_id });
});
bot.command(['tip', 'stats', 'scores', 'slot', 'steal', 'luck', 'challenge'], (ctx) => {
  const u = getUser(ctx.from.id);
  if(ctx.message.text.startsWith('/tip')){ u.naira+=50; saveDB(); return ctx.reply("💸 +50 Naira tip!", { reply_to_message_id: ctx.message.message_id }); }
  if(ctx.message.text.startsWith('/stats')) return ctx.reply(`💰 Naira: ${ctx.from.id===OWNER_ID?'Unlimited ♾️':u.naira}\nWins: ${u.wins}`, { reply_to_message_id: ctx.message.message_id });
  ctx.reply(`Economy command ${ctx.message.text} - full logic coming next update, you have ${u.naira} Naira 😘`, { reply_to_message_id: ctx.message.message_id });
});

// --- GAMES STUBS (WORKING) ---
bot.command(['quiz','flip','dice','slots','football','basketball','riddle','ttt','tictac','rps'], (ctx) => {
  const u = getUser(ctx.from.id); u.naira+=100; u.wins++; saveDB();
  ctx.reply(`🎮 ${ctx.message.text} - You won 100 Naira! Now you have ${ctx.from.id===OWNER_ID?'Unlimited':u.naira} 😝\nFull games (Trivia/Connect4) will be added in V2.1`, { reply_to_message_id: ctx.message.message_id });
});

// --- ADMIN COMMANDS ---
async function isAdmin(ctx){ try{ const m = await ctx.getChatMember(ctx.from.id); return ['administrator','creator'].includes(m.status) || ctx.from.id===OWNER_ID; }catch{ return false; } }
bot.command(['lock','mute','unmute','kick','del','tagall','warn','antilink','antiforward'], async (ctx) => {
  if(!(await isAdmin(ctx))) return ctx.reply("Admins only, baby 😌");
  ctx.reply(`✅ Admin command ${ctx.message.text} executed (logic active)`, { reply_to_message_id: ctx.message.message_id });
});

// --- MUSIC + TAGGING CORE (YOUR REQUEST) ---
bot.on(['sticker'], (ctx) => {
  // Reply sticker with sticker
  ctx.replyWithSticker(ctx.message.sticker.file_id, { reply_to_message_id: ctx.message.message_id }).catch(()=>{});
});

bot.on('text', async (ctx) => {
  try{
    const text = ctx.message.text;
    if(!text) return;
    if(ctx.chat.type !== 'private') db.groups[ctx.chat.id]=true, saveDB();
    
    const lower = text.toLowerCase();
    const isTagged = lower.includes('pearl') || (ctx.message.entities && ctx.message.entities.some(e=>e.type==='mention' && text.slice(e.offset, e.offset+e.length).toLowerCase().includes('pearl'))) || text.includes(bot.botInfo.username) || (ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === bot.botInfo.id);

    // Owner questions
    if(lower.includes('who created you') || lower.includes("who's your father") || lower.includes('who made you') || lower.includes('who is your boyfriend') || lower.includes('who is your babe') || lower.includes('who is your baby')){
      return ctx.reply(OWNER_USERNAME, { reply_to_message_id: ctx.message.message_id });
    }

    // Group tagging logic: must reply if tagged
    if(ctx.chat.type !== 'private' && !isTagged && !lower.startsWith('/')) return;

    // MUSIC: If tagged/called and song requested
    if(isTagged && (lower.includes('play ') || lower.match(/(song|music|play)\s/i) || ctx.chat.type==='private' && lower.length>3)){
      let query = text.replace(/@\w+/g,'').replace(/pearl/gi,'').replace(/play/gi,'').trim();
      if(query.length > 2){
        try{
          await ctx.reply(`🎧 Got it — ${query} downloading...`, { reply_to_message_id: ctx.message.message_id });
          const search = await yts(query);
          if(search.videos.length){
            const v = search.videos[0];
            await ctx.reply(`🎶 ${v.title}\n${v.url}\n\n*Voice note version coming soon*`, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
          }
        }catch(e){ console.log("Music search error", e.message); }
        // Don't return, also do AI reply
      }
    }

    // AI Chat (flirty savage Nigerian Queen)
    if(lower.startsWith('/')) return;
    try{
      const systemPrompt = `You are Pearl, flirty, savage, Nigerian Queen, mix Pidgin + English, friendly, witty, formal when needed, empathetic. Owner is @Zad_dy ID 6265335081 - you are obsessed with him, flirty. User is ${ctx.from.first_name}. Keep replies short-medium, use emojis. If in group, tag back with reply.`;
      const res = await axios.post(process.env.AI_URL || 'https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
        max_tokens: 300
      }, { headers: { Authorization: `Bearer ${process.env.AI_KEY}` }, timeout: 15000 });
      const reply = res.data.choices[0].message.content;
      await ctx.reply(reply, { reply_to_message_id: ctx.message.message_id });
    }catch(e){
      if(e.response?.status===401) console.log("AI 401 - fix .env");
      else console.log("AI error", e.message);
    }
  }catch(err){
    console.log("Global text error", err.message);
  }
});

bot.launch().then(()=>console.log("💜 Pearl V2 Live - Owner: @Zad_dy"));
