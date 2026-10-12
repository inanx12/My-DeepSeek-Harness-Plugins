# DeepSeek-chan 🐋 — a pet plugin for DeepSeek Harness

[Türkçe](README.md) | **English**

**DeepSeek-chan**, a whale girl, lives on top of the DSH window. She reacts to your clicks, drags, head pats
and the state of your sessions with a speech bubble and an emoji badge in her top-right corner.

She is modelled on the behaviour of the community `dsh-plugin-whale-pet` (Whale Companion) plugin, with more
interactions, more emotions and video support on top.

## Interactions

| You do | She does |
|---|---|
| **Left click** | A random reaction (happy, laughing, winking, shy, smug, confused, thankful, "......" …). While working she says "I'm busy right now"; while asleep, "I wasn't sleeping!" |
| **Double click** | Love 💙 — heartbeat animation and floating hearts |
| **5 quick clicks** | Gets angry 💢 (shakes) |
| **7 quick clicks** | Gets furious and shouts 🤬 |
| **9 quick clicks** | Sulks 😤 — **turns her back on you** and ignores clicks |
| **Middle click (wheel click)** | Head pat 😳. **Forgives you** if she is sulking |
| **Drag** | Hangs from the cursor and swings with your speed; shake her fast and she panics 😱; thanks you when dropped |
| **Mouse wheel** | Resizes her (60–180 %, can be turned off in settings) |
| **Right click** / `Enter` | Settings panel |
| **Arrow keys** (`Shift` for bigger steps) | Moves her |
| **Hover** | Shows the status bubble and emoji |
| **Touch screens** | Tap = click, double tap = love, long press = settings, drag with a finger = move |

## How she reacts to DSH sessions

| State | What you see |
|---|---|
| Idle | Full-body pose, breathing animation, occasional idle chatter ("Good morning!", "It's late…" depending on the hour) |
| Working | "Let's go!" pose 💪, a `×2` counter when several sessions run |
| Waiting for approval / an answer | Pleading look 🥺, bubble stays open (highest priority) |
| Task finished | Jump and sparkles ✨ ("Done!", "I'm the best!") |
| Idle for a long time | Falls asleep 💤 (Zzz), wakes up when clicked |
| No connection | Waits quietly |

Settings: follow scope (all sessions / current session), size, nap delay (30 s / 2 min / 5 min / never),
language (auto / Türkçe / English / 中文), animations, idle chatter, scroll-to-resize, reset position,
hide / bring back. Preferences are kept in the browser's `localStorage`.

> **Known limitation:** DSH's client side does not say *why* a turn ended (success / cancel / error).
> So the "done" celebration can also appear when you cancel a turn. The official whale pet adds a separate
> Host bridge to tell them apart; this plugin deliberately stays client-only (simpler, less fragile, no code
> running on the Host).

## Installation

The built plugin (`lib/client.js`) is committed, so you do not need to build anything.

**1) tgz package (easiest).** Run `npm pack` in this folder (or use a released
`dsh-plugin-deepseek-chan-0.2.1.tgz`), keep the file somewhere permanent without extracting it, and paste
its absolute path into DSH's **Plugins → Install** field:

```text
C:\dsh-plugins\dsh-plugin-deepseek-chan-0.2.1.tgz
```

**2) Local folder (best for development).** Clone the repo and paste the absolute path of this folder:

```text
/home/you/My-DeepSeek-Harness-Plugins/deepseek-chan-pet
```

**3) Straight from GitHub.** DSH installs through `pnpm add`, and pnpm can take a subfolder with this
syntax (this may not work on every DSH version; fall back to 1 or 2 if it fails):

```text
github:inanx12/My-DeepSeek-Harness-Plugins#path:/deepseek-chan-pet
```

The path must be absolute; DSH rejects relative paths. After installing she appears in the bottom-right
corner. After an update, let running tasks finish, then fully quit and reopen DSH (closing the window may
not quit the app).

## Animations as video

**Yes, supported:** put `assets/videos/<pose>.webm` (or `.mp4`) in place and run `node tools/build.mjs`;
that pose then plays as a muted, looping video instead of the sprite. Details are in
[`assets/videos/README.en.md`](assets/videos/README.en.md). In short:

- Use **WebM VP9 with alpha** for a transparent background. DSH Desktop is Chromium-based and plays it
  fine. MP4/H.264 has no alpha, so a box appears around the character.
- Got a green-screen clip? `PINGPONG=1 tools/video-to-webm.sh clip.mp4 idle` (ffmpeg chromakey → VP9 alpha, seamless forward/backward loop).
- Green-screen start frames and ready-made prompts for generating videos live in `art/video-inputs/` (regenerate with `python3 tools/make-video-inputs.py`).
- 2–4 s loops, ~360 px tall, under ~300 KB per file. Files are embedded into `lib/client.js` as base64
  (DSH does not serve plugin files from a separate URL), so keep the total to a few MB.
- Alternative: an animated WebP/APNG instead of video → `assets/animated/<pose>.webp`.

Pose names: `idle happy cheer pleading angry smug crying surprised sleepy love shy sulk back proud speechless scheming go panic thanks side furious excited laugh dizzy shocked pout smile nervous bashful smirk thinking confused wink adoring yawn sad`

## Artwork

There are 36 poses: the full-body pose, front/side/back poses and 32 sticker emotions. The sticker sources
live in the repo's `Emojiler/` folder, and `tools/process-art.py` turns them into transparent sprites:

- `Emojiler/eskilerin yüksek çözünürlüklüleri/` ("HD versions of the old ones"): HD versions of the first
  16 emotions. The Chinese caption under each one is cut off.
- `Emojiler/yeni eklenecek emojiler/` ("new emojis to add"): 16 new emotions (furious, excited, laughing,
  dizzy, shocked, pouting, smiling, nervous, bashful, smirking, thinking, confused, winking, heart eyes,
  yawning, sad). The white sticker border is removed.

To add a sticker: drop the file into one of these folders, add a file name → pose name row to the table in
`process-art.py`, add an emotion and some lines to `src/dialogue.js`, then rebuild.

## Development

```sh
python3 tools/process-art.py   # art/source/* + ../Emojiler/* → assets/sprites/*.webp (Pillow + numpy; ~2 min)
node tools/build.mjs           # src/ + sprites/videos → lib/client.js and preview/index.html
npm test                       # state machine + package tests (node:test, no dependencies)
```

Open `preview/index.html` in a browser for an offline preview that runs without DSH and simulates session
states with buttons.

```
src/dialogue.js   emotions (pose, emoji, animation, effect) + TR/EN/ZH lines
src/state.js      preferences, SessionTracker (DSH state projection), PetBrain (priorities, combos, sleep)
src/widget.js     shadow-DOM UI: sprite/video, typewriter bubble, badge, dragging, settings panel
src/adapter.js    DSH glue: shell.overlay slot, useSessions/useSessionStatus, connection, locale
src/pet.css       animations and theme (DSH --dsw-* tokens)
index.js          Host half (empty — everything runs in the browser)
```

## Privacy

She does not read chat content, makes no model calls, and adds no network requests, ports or telemetry.
She only uses the "working / waiting" session status that DSH already provides.

## License and artwork

The code is MIT. **The character artwork is not MIT**; it belongs to its original artist (the turnaround
sheet carries the mark "知乎 @阿落"). Get the artist's permission before sharing the repo publicly or
distributing the plugin. This is not an official DeepSeek product.
