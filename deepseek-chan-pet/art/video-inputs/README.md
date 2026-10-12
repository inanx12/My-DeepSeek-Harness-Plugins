# Video girişleri ve prompt'lar

**Türkçe** | [English](#english)

Bu klasördeki üç görsel, görselden videoya araçlarına (Kling, Runway, Hailuo, Veo, Pika…) yüklenecek
**başlangıç kareleri**. Hepsi saf yeşil (`#00FF00`) zeminde; araç videoyu aynı yeşilde üretir,
`tools/video-to-webm.sh` de yeşili şeffaf yapar. Beyaz zemin kullanma: beyazı silmek önlüğü de siler.

| Dosya | Poz | Oran | Ne zaman görünür |
|---|---|---|---|
| `idle.png` | `idle` | 9:16 | Boşta (ekranda en çok kalan poz, ilk bunu dene) |
| `yawn.png` | `yawn` | 1:1 | Uyurken / uyanırken |
| `thinking.png` | `thinking` | 1:1 | Görev çalışırken |

Yeniden üretmek için: `python3 tools/make-video-inputs.py`

## Adımlar

1. Aracı **görselden videoya** modunda aç, görseli yükle, oranı görselinkiyle aynı seç (idle 9:16, diğerleri 1:1).
2. Aşağıdaki prompt'u yapıştır. Negatif prompt alanı varsa onu da doldur.
3. **5 saniye** seç; en kısa seçenek yeterli. Kamera hareketi varsa **sabit / static** yap.
4. Birkaç deneme üret, **yüzün ve kıyafetin bozulmadığı** ve arka planın düz yeşil kaldığı birini seç.
5. MP4'ü `Emojiler/` yanına ya da istediğin yere koy, sonra plugin klasöründe:

   ```sh
   PINGPONG=1 DURATION=2.5 tools/video-to-webm.sh idle-klip.mp4 idle
   node tools/build.mjs
   ```

   - `PINGPONG=1`: klip ileri sonra geri oynar, döngüde sıçrama olmaz. Hareket "nefes alma" gibi gidip
     geliyorsa ideal. Kendisi zaten kusursuz döngü olan bir klipte `PINGPONG` koyma.
   - `DURATION`: klibin ilk kaç saniyesi alınsın (2–3 sn yeterli; pingpong ile iki katı oynar).
   - `START=0.4`: ilk karelerde bozulma varsa baştan atla.
   - `CROP=1080:1720:0:200`: üstte/yanlarda boş yeşil çok kalırsa kadrajı daralt (genişlik:yükseklik:x:y,
     kaynak piksel). Emoji rozeti kadrajın sağ üstüne oturduğu için kadraj sıkı olmalı.
   - Kenarda yeşil kalırsa `SIMILARITY=0.2`, saç uçları silinirse `SIMILARITY=0.1` dene.

6. Önizlemeyi aç (`preview/index.html`), beğenirsen commit'le. Hedef: dosya başına **~300 KB altı**.

## Prompt'lar

Araçların çoğu İngilizce prompt'u daha iyi anlıyor, o yüzden prompt'lar İngilizce.

### Ortak negatif prompt

```text
camera movement, zoom, pan, background change, gradient background, shadows on background, text,
watermark, extra characters, extra limbs, deformed hands, face distortion, outfit change, color shift,
realistic style, 3D render, blurry, flickering
```

### idle.png (9:16)

```text
Chibi anime whale girl in a navy maid dress standing still on a solid pure green (#00FF00) chroma key
background. Subtle idle loop: she breathes gently, blinks once slowly, her long wavy blue hair sways
softly, her whale ears twitch slightly and the whale tail wags gently. She keeps her hands clasped and
keeps smiling. Static locked camera, flat even lighting, the green background stays perfectly flat and
unchanged, same 2D anime art style and colors as the input image, no new objects.
```

### yawn.png (1:1)

```text
Chibi anime whale girl, sleepy, on a solid pure green (#00FF00) chroma key background. She yawns slowly
with a hand over her mouth, eyes half closed, head nodding down a little as if dozing off, then slowly
lifting again. Hair moves softly. Static locked camera, flat lighting, the green background stays flat
and unchanged, same 2D anime art style and colors as the input image.
```

### thinking.png (1:1)

```text
Chibi anime whale girl thinking hard on a solid pure green (#00FF00) chroma key background. Finger on
her chin, she tilts her head slowly from side to side, blinks, eyes glance up as if pondering, a small
pout. Hair sways softly. Static locked camera, flat lighting, the green background stays flat and
unchanged, same 2D anime art style and colors as the input image.
```

## İpuçları

- **İlk kare = görsel:** çoğu araç ilk kareyi aynen korur; bozulma genelde 3. saniyeden sonra başlar.
  Bu yüzden ilk 2–3 saniyeyi alıp `PINGPONG=1` kullanmak en temiz sonucu verir.
- **"Son kare" seçeneği** (Kling/Runway'de var) varsa ilk ve son kareye aynı görseli koy: araç kendisi
  kusursuz döngü üretir, o zaman `PINGPONG` gerekmez.
- **Yüz kayıyorsa** prompt'taki hareketleri azalt (sadece "blinks and breathes").

---

## English

The three images here are **start frames** for image-to-video tools (Kling, Runway, Hailuo, Veo, Pika…).
They sit on pure green (`#00FF00`); the tool animates them on the same green and
`tools/video-to-webm.sh` keys the green out. Do not use a white background: keying white deletes her apron.

| File | Pose | Aspect | Shown when |
|---|---|---|---|
| `idle.png` | `idle` | 9:16 | Idle (the pose on screen most of the time, try this first) |
| `yawn.png` | `yawn` | 1:1 | Falling asleep / waking up |
| `thinking.png` | `thinking` | 1:1 | While a task runs |

Regenerate with `python3 tools/make-video-inputs.py`.

**Steps:** use image-to-video, upload the image with the same aspect, paste the prompt above (and the
negative prompt), pick 5 s and a static camera, generate a few takes and keep the one where the face and
outfit stay intact. Then:

```sh
PINGPONG=1 DURATION=2.5 tools/video-to-webm.sh idle-clip.mp4 idle
node tools/build.mjs
```

`PINGPONG=1` plays the clip forward then backward for a seamless loop; `DURATION` takes the first N
seconds; `START` skips a bad start; `CROP=w:h:x:y` frames her tightly (the emoji badge sits on the frame's
top-right corner); tune `SIMILARITY` if green remains (raise) or hair tips vanish (lower). Aim for under
~300 KB per file. If the tool supports a *last frame*, use the same image for first and last frame to get a
native seamless loop and skip `PINGPONG`.
