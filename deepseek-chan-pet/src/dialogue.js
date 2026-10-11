/**
 * Emotions and lines. An emotion decides the pose (sprite or video), the emoji
 * badge in the top-right corner, the body animation and the particle effect.
 * A line always names its emotion, so the bubble text and the badge agree.
 */
export const EMOTIONS = Object.freeze({
  idle:       { pose: 'idle',       emoji: '🐋', anim: 'breathe',  fx: '' },
  happy:      { pose: 'happy',      emoji: '😆', anim: 'bounce',   fx: 'sparkle' },
  cheer:      { pose: 'cheer',      emoji: '✨', anim: 'hop',      fx: 'sparkle' },
  pleading:   { pose: 'pleading',   emoji: '🥺', anim: 'tilt',     fx: '' },
  angry:      { pose: 'angry',      emoji: '💢', anim: 'shake',    fx: '' },
  smug:       { pose: 'smug',       emoji: '😏', anim: 'tilt',     fx: '' },
  crying:     { pose: 'crying',     emoji: '😭', anim: 'tremble',  fx: '' },
  surprised:  { pose: 'surprised',  emoji: '😲', anim: 'startle',  fx: '' },
  sleepy:     { pose: 'sleepy',     emoji: '💤', anim: 'doze',     fx: 'zzz' },
  love:       { pose: 'love',       emoji: '💙', anim: 'heartbeat', fx: 'hearts' },
  shy:        { pose: 'shy',        emoji: '😳', anim: 'squirm',   fx: 'blush' },
  sulk:       { pose: 'sulk',       emoji: '😤', anim: 'huff',     fx: '' },
  turnaway:   { pose: 'back',       emoji: '😤', anim: 'huff',     fx: '' },
  proud:      { pose: 'proud',      emoji: '😎', anim: 'puff',     fx: 'sparkle' },
  speechless: { pose: 'speechless', emoji: '😶', anim: 'none',     fx: '' },
  scheming:   { pose: 'scheming',   emoji: '😈', anim: 'ominous',  fx: '' },
  go:         { pose: 'go',         emoji: '💪', anim: 'work',     fx: '' },
  panic:      { pose: 'panic',      emoji: '😱', anim: 'panic',    fx: '' },
  thanks:     { pose: 'thanks',     emoji: '🙏', anim: 'bow',      fx: '' },
  carried:    { pose: 'side',       emoji: '🎈', anim: 'swing',    fx: '' },
  resize:     { pose: 'idle',       emoji: '🔍', anim: 'breathe',  fx: '' },
  // Second sticker set.
  furious:    { pose: 'furious',    emoji: '🤬', anim: 'shake',    fx: '' },
  excited:    { pose: 'excited',    emoji: '🤩', anim: 'hop',      fx: 'sparkle' },
  laugh:      { pose: 'laugh',      emoji: '😂', anim: 'bounce',   fx: '' },
  dizzy:      { pose: 'dizzy',      emoji: '😵‍💫', anim: 'panic',    fx: '' },
  shocked:    { pose: 'shocked',    emoji: '😨', anim: 'startle',  fx: '' },
  pout:       { pose: 'pout',       emoji: '😠', anim: 'huff',     fx: '' },
  smile:      { pose: 'smile',      emoji: '😊', anim: 'breathe',  fx: 'sparkle' },
  nervous:    { pose: 'nervous',    emoji: '😅', anim: 'tremble',  fx: '' },
  bashful:    { pose: 'bashful',    emoji: '☺️', anim: 'squirm',   fx: 'blush' },
  smirk:      { pose: 'smirk',      emoji: '😼', anim: 'tilt',     fx: '' },
  thinking:   { pose: 'thinking',   emoji: '🤔', anim: 'tilt',     fx: '' },
  confused:   { pose: 'confused',   emoji: '❓', anim: 'tilt',     fx: '' },
  wink:       { pose: 'wink',       emoji: '😜', anim: 'hop',      fx: '' },
  adoring:    { pose: 'adoring',    emoji: '😍', anim: 'heartbeat', fx: 'hearts' },
  yawn:       { pose: 'yawn',       emoji: '🥱', anim: 'doze',     fx: 'zzz' },
  sad:        { pose: 'sad',        emoji: '😢', anim: 'tremble',  fx: '' },
});

const L = (id, emotion, tr, en, zh) => Object.freeze({ id, emotion, text: Object.freeze({ tr, en, zh }) });

/** Pools by trigger. `hours` limits a line to a local-time window [from, to). */
export const LINES = Object.freeze({
  hello: [
    L('hello.1', 'cheer', 'Merhaba! Ben DeepSeek-chan, bugün de beraberiz~', 'Hi! I’m DeepSeek-chan. Let’s work together today~', '你好！我是 DeepSeek 酱，今天也一起加油~'),
    L('hello.2', 'happy', 'Geldim geldim! Bugün ne yapıyoruz?', 'I’m here! What are we doing today?', '来啦来啦！今天做什么呢？'),
    L('hello.3', 'excited', 'Yaşasın, geldin! Hadi başlayalım!', 'Yay, you’re here! Let’s get started!', '耶，你来啦！开始吧！'),
    L('hello.4', 'smile', 'Tekrar hoş geldin~', 'Welcome back~', '欢迎回来~'),
  ],
  poke: [
    L('poke.1', 'happy', 'Hihi, gıdıklanıyorum!', 'Hehe, that tickles!', '嘻嘻，好痒！'),
    L('poke.2', 'smug', 'Hmm hmm~ Bana mı ihtiyacın var?', 'Hmm hmm~ Need something from me?', '哼哼~ 有事找我吗？'),
    L('poke.3', 'proud', 'Ben en iyi asistanım, biliyorsun değil mi?', 'I’m the best assistant, you know that, right?', '本小姐可是最棒的助手哦！'),
    L('poke.4', 'thanks', 'Bugün de çok çalıştın, teşekkürler~', 'You worked hard today, thank you~', '今天也辛苦啦，谢谢~'),
    L('poke.5', 'shy', 'Ö-öyle bakınca utanıyorum...', 'D-don’t stare like that...', '这样看着我…好害羞…'),
    L('poke.6', 'speechless', '......', '......', '……'),
    L('poke.7', 'scheming', 'Hı hı hı~ Bir planım var...', 'Heh heh heh~ I have a plan...', '呵呵呵~ 我有个计划…'),
    L('poke.8', 'pleading', 'Bir kahve molası versek mi? Lütfeeen~', 'Coffee break? Pleeease~', '休息一下喝杯咖啡嘛~'),
    L('poke.9', 'surprised', 'Ah?! Birden dürtme öyle!', 'Ah?! Don’t poke me out of nowhere!', '啊？！突然戳我干嘛！'),
    L('poke.10', 'go', 'Hadi, bir sonraki göreve!', 'Come on, on to the next task!', '冲鸭！下一个任务！'),
    L('poke.11', 'laugh', 'Ahahaha! Dur, gülmekten öleceğim!', 'Ahahaha! Stop, I can’t breathe!', '哈哈哈！停，笑死我了！'),
    L('poke.12', 'wink', 'Göz kırptım, fark ettin mi? 😉', 'I winked, did you notice?', '我眨眼了，发现了吗？'),
    L('poke.13', 'smirk', 'Hımm, yine mi sen?', 'Hmm, you again?', '嗯？又是你？'),
    L('poke.14', 'confused', 'Hm? Bir şey mi dedin?', 'Hm? Did you say something?', '嗯？你说什么了吗？'),
    L('poke.15', 'smile', 'Buradayım, merak etme~', 'I’m right here, don’t worry~', '我在这里，别担心~'),
    L('poke.16', 'shocked', 'Hıı?! Korkuttun beni!', 'Eek?! You scared me!', '诶？！吓我一跳！'),
  ],
  pokeWorking: [
    L('pokeWorking.1', 'go', 'Şu an çalışıyorum, sonra oynarız!', 'I’m working right now, let’s play later!', '正在工作中，等会儿再玩！'),
    L('pokeWorking.2', 'speechless', 'Şşş... düşünüyorum...', 'Shh... I’m thinking...', '嘘……我在思考……'),
    L('pokeWorking.3', 'pout', 'Hmph, çalışırken rahatsız etme!', 'Hmph, don’t bother me while I work!', '哼，工作的时候别打扰我！'),
    L('pokeWorking.4', 'nervous', 'Ehehe... biraz zorlandım ama hallediyorum!', 'Ehehe... it’s tricky, but I’ve got it!', '诶嘿嘿…有点难，但我能搞定！'),
  ],
  pokeWaiting: [
    L('pokeWaiting.1', 'pleading', 'Önce şu onayı verir misin? Lütfen~', 'Could you answer that request first? Please~', '先帮我确认一下嘛~'),
    L('pokeWaiting.2', 'confused', 'Cevabını bekliyorum ama... unuttun mu?', 'Still waiting for your answer... did you forget?', '还在等你回答…你忘了吗？'),
  ],
  wake: [
    L('wake.1', 'surprised', 'Ah?! Uyumuyordum! Gerçekten!', 'Ah?! I wasn’t sleeping! Really!', '啊？！我才没睡呢！'),
    L('wake.2', 'sleepy', 'Hıı... beş dakika daha...', 'Mmm... five more minutes...', '嗯……再睡五分钟……'),
    L('wake.3', 'yawn', 'Haaah... günaydın... saat kaç?', 'Haaah... morning... what time is it?', '哈啊…早…几点了？'),
    L('wake.4', 'shocked', 'Uyandım uyandım! Bir şey kaçırmadım, değil mi?!', 'I’m up, I’m up! I didn’t miss anything, right?!', '醒了醒了！没错过什么吧？！'),
  ],
  forgive: [
    L('forgive.1', 'thanks', 'Hmph... peki, affettim. Bu seferlik!', 'Hmph... fine, you’re forgiven. Just this once!', '哼…好吧，原谅你了，就这一次！'),
  ],
  angry: [
    L('angry.1', 'angry', 'Yeter ama! Beni oyuncak mı sandın?!', 'Enough! Am I a toy to you?!', '够了！我又不是玩具！'),
    L('angry.2', 'angry', 'Bir daha dürtersen ısırırım!', 'Poke me again and I’ll bite!', '再戳我就咬你哦！'),

  ],
  furious: [
    L('furious.1', 'furious', 'YETER! Gerçekten sinirlendim artık!', 'ENOUGH! Now I’m really mad!', '够了！我真的生气了！'),
    L('furious.2', 'furious', 'Bir tık daha, bir tık daha ve küserim!', 'One more click and I’m sulking!', '再点一下我就不理你了！'),
  ],
  sulk: [
    L('sulk.1', 'turnaway', 'Hmph! Artık seninle konuşmuyorum!', 'Hmph! I’m not talking to you anymore!', '哼！不理你了！'),
    L('sulk.2', 'sulk', 'Hmph! Küstüm!', 'Hmph! I’m sulking now!', '哼！生气了！'),
    L('sulk.3', 'pout', 'Hmph! Önce özür dile!', 'Hmph! Apologize first!', '哼！先道歉！'),
  ],
  love: [
    L('love.1', 'love', 'Seni seviyorum~ 💙', 'Love you~ 💙', '爱你~ 💙'),
    L('love.2', 'love', 'Kalbim pıt pıt atıyor!', 'My heart is going doki-doki!', '心跳加速了！'),
    L('love.3', 'adoring', 'Gözlerim kalp oldu, görüyor musun? 😍', 'My eyes turned into hearts, see?', '眼睛都变成爱心了，看到了吗？'),
    L('love.4', 'bashful', 'B-ben de seni seviyorum... galiba...', 'I-I love you too... I think...', '我、我也喜欢你…大概…'),
  ],
  pat: [
    L('pat.1', 'shy', 'E-ehh... başımı okşama öyle...', 'E-ehh... don’t pat my head like that...', '诶…别摸头啦…'),
    L('pat.2', 'shy', 'Hmm... aslında biraz hoşuma gitti...', 'Mmm... actually, I kinda like it...', '嗯…其实有点喜欢…'),
    L('pat.3', 'happy', 'Hehe~ Daha, daha!', 'Hehe~ More, more!', '嘿嘿~ 还要还要！'),
    L('pat.4', 'bashful', 'Hehe... bu çok güzel...', 'Hehe... this is nice...', '嘿嘿…好舒服…'),
    L('pat.5', 'smile', 'Teşekkürler, moralim düzeldi~', 'Thanks, that cheered me up~', '谢谢，心情变好了~'),
  ],
  dragStart: [
    L('dragStart.1', 'surprised', 'Ah?! Nereye götürüyorsun?', 'Ah?! Where are you taking me?', '啊？！要带我去哪？'),
    L('dragStart.2', 'carried', 'Uçuyorum~!', 'I’m flying~!', '飞起来啦~！'),
  ],
  dragging: [
    L('dragging.1', 'carried', 'Wiii~!', 'Wheee~!', '呜呼~！'),
  ],
  dragFast: [
    L('dragFast.1', 'panic', 'Dur duur! Başım dönüyor!', 'Stop stop! I’m getting dizzy!', '不要啊——！头好晕！'),
    L('dragFast.2', 'dizzy', 'Dünyaa dönüyoor... @_@', 'The world is spinning... @_@', '天旋地转…@_@'),
  ],
  drop: [
    L('drop.1', 'thanks', 'Burası güzelmiş, teşekkürler~', 'Nice spot, thanks~', '这里不错，谢谢啦~'),
    L('drop.2', 'smug', 'Hmm, manzara fena değil.', 'Hmm, not a bad view.', '嗯，风景还不错。'),
    L('drop.3', 'dizzy', 'Hâlâ başım dönüyor ama... teşekkürler...', 'Still dizzy, but... thanks...', '头还晕着…谢谢…'),
  ],
  working: [
    L('working.1', 'go', 'Hadi bakalım, iş başına!', 'Alright, let’s get to work!', '冲鸭！开工啦！'),
    L('working.2', 'go', 'Bir yol arıyorum...', 'Looking for a way...', '正在想办法…'),
    L('working.3', 'speechless', 'Hmm, bunu iyice düşünmem lazım...', 'Hmm, let me think this through...', '让我好好想想…'),
    L('working.4', 'go', 'Azar azar ilerliyoruz!', 'Making a little progress!', '一点点搞定它！'),
    L('working.5', 'thinking', 'Hmm... şöyle mi yapsam, böyle mi?', 'Hmm... this way or that way?', '嗯…这样还是那样呢？'),
    L('working.6', 'nervous', 'Bu biraz uzun sürebilir, ehehe...', 'This might take a bit, ehehe...', '这可能要一会儿，诶嘿嘿…'),
  ],
  waiting: [
    L('waiting.1', 'pleading', 'Senin onayın lazım, bir bakar mısın?', 'I need your OK, could you take a look?', '需要你确认一下哦~'),
    L('waiting.2', 'pleading', 'Bir soru sordum, cevabını bekliyorum~', 'I asked something, waiting for you~', '我问了个问题，等你回答~'),
    L('waiting.3', 'confused', 'Nasıl devam edeyim? Sen söyle~', 'How should I continue? You tell me~', '接下来怎么做？你说~'),
  ],
  done: [
    L('done.1', 'happy', 'Bitti! Bir görevi daha tamamladık!', 'Done! Another task finished!', '完成啦！又搞定一个！'),
    L('done.2', 'proud', 'Gördün mü? Ben en iyisiyim!', 'See? I’m the best!', '看吧！本小姐最棒！'),
    L('done.3', 'cheer', 'Yaşasın! Kendine bir alkış!', 'Yay! Give yourself a hand!', '耶！给自己鼓个掌！'),
    L('done.4', 'thanks', 'Tamamdır, beklediğin için teşekkürler~', 'All set, thanks for waiting~', '好啦，谢谢你等我~'),
    L('done.5', 'excited', 'Bittiii! Muhteşemiz!', 'Doooone! We’re amazing!', '完成啦！我们太棒了！'),
    L('done.6', 'wink', 'Kolay işti~ 😉', 'Piece of cake~', '小菜一碟~'),
  ],
  sleeping: [
    L('sleeping.1', 'sleepy', 'Biraz kestiriyorum... Zzz', 'Just a little nap... Zzz', '我先眯一会儿…Zzz'),
    L('sleeping.2', 'yawn', 'Haaah... gözlerim kapanıyor...', 'Haaah... my eyes are closing...', '哈啊…眼睛睁不开了…'),
  ],
  idle: [
    L('idle.1', 'smug', 'Sıkıldın mı? Bana bir iş ver~', 'Bored? Give me something to do~', '无聊吗？给我点事做嘛~'),
    L('idle.2', 'happy', 'Bugün hava güzel mi dışarıda?', 'Is it nice outside today?', '今天外面天气好吗？'),
    L('idle.3', 'pleading', 'Su içmeyi unutma, tamam mı?', 'Don’t forget to drink water, okay?', '记得喝水哦~'),
    L('idle.4', 'speechless', '......', '......', '……'),
    L('idle.5', 'scheming', 'Hı hı hı~ Kodlarını izliyorum...', 'Heh heh~ I’m watching your code...', '呵呵呵~ 我在看着你的代码…'),
    L('idle.6', 'proud', 'Bir balina olarak çok yetenekliyim!', 'For a whale, I’m very talented!', '作为鲸鱼，我可是很厉害的！'),
    L('idle.morning', 'cheer', 'Günaydın! Kahveni aldın mı?', 'Good morning! Got your coffee?', '早上好！喝咖啡了吗？'),
    L('idle.night', 'sleepy', 'Gece oldu... Uyusak mı artık?', 'It’s late... Shall we sleep?', '好晚了…要不要睡觉？'),
    L('idle.7', 'sad', 'Beni unuttun mu? Biraz yalnız hissettim...', 'Did you forget me? I felt a bit lonely...', '你忘了我吗？有点寂寞…'),
    L('idle.8', 'thinking', 'Acaba balinalar kod yazabilir mi? Ben yazıyorum!', 'Can whales code? Well, I do!', '鲸鱼会写代码吗？我会！'),
    L('idle.9', 'wink', 'Bugün de harika görünüyorsun~', 'You look great today~', '你今天也很棒哦~'),
    L('idle.10', 'laugh', 'Aklıma komik bir şey geldi, ahaha!', 'I just remembered something funny, ahaha!', '想到好笑的事了，哈哈！'),
  ],
  rest: [
    L('rest.1', 'idle', 'Biraz dinleniyorum, hazır olunca seslen~', 'Taking a little rest. Call me when you’re ready~', '休息一下，准备好了叫我~'),
    L('rest.2', 'smile', 'Hazırım, ne zaman istersen~', 'Ready whenever you are~', '随时准备好了~'),
  ],
  unavailable: [
    L('unavailable.1', 'speechless', 'Buradayım, sinyal bekliyorum...', 'I’m here, waiting for a signal...', '我在这里，等待信号中…'),
  ],
});

/** Lines that only make sense at certain local hours. */
const HOURS = Object.freeze({ 'idle.morning': [6, 11], 'idle.night': [23, 29] });

function inHours(id, hour) {
  const window = HOURS[id];
  if (!window) return true;
  const [from, to] = window;
  return (hour >= from && hour < to) || (hour + 24 >= from && hour + 24 < to);
}

/** Pick a line from a pool, never repeating the previous pick when there is a choice. */
export function pickLine(trigger, { random = Math.random, previous, hour = new Date().getHours() } = {}) {
  const pool = (LINES[trigger] || []).filter(line => inHours(line.id, hour));
  if (!pool.length) return undefined;
  const choices = pool.length > 1 ? pool.filter(line => line.id !== previous) : pool;
  const index = Math.min(choices.length - 1, Math.max(0, Math.floor((Number(random()) || 0) * choices.length)));
  return choices[index];
}

export function lineText(line, language) {
  if (!line) return '';
  return line.text[language] ?? line.text.en;
}

export function emotionOf(name) {
  return EMOTIONS[name] || EMOTIONS.idle;
}
