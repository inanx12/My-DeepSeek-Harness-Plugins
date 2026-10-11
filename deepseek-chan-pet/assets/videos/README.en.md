# Videos (optional)

[Türkçe](README.md) | **English**

Put `<pose>.webm` or `<pose>.mp4` here and that pose plays as a looping, muted video instead of its sprite.
Then run `node tools/build.mjs`.

Pose names: `idle happy cheer pleading angry smug crying surprised sleepy love shy sulk back proud speechless scheming go panic thanks side furious excited laugh dizzy shocked pout smile nervous bashful smirk thinking confused wink adoring yawn sad`

- **Recommended:** WebM with VP9 + alpha (transparent background). To convert a green-screen clip:
  `tools/video-to-webm.sh clip.mp4 happy`
- MP4 (H.264) has no alpha: a box shows around the character.
- Keep it short (2–4 s loop), 320–400 px tall, with the character framed tightly (the emoji badge goes in
  the top-right corner of the frame).
- Everything is embedded into `lib/client.js`: stay under ~300 KB per file and a few MB in total.
- For transparent animation you can also use `assets/animated/<pose>.webp|gif|png` (animated WebP/APNG)
  instead of video.
