# DeepSeek-chan 🐋 — DeepSeek Harness pet plugin'i

Balina kız **DeepSeek-chan**, DSH penceresinin üstünde yaşar: tıklamana, sürüklemene, başını okşamana ve
oturumlarının durumuna konuşma balonu + sağ üst köşede emoji rozetiyle tepki verir.

Resmi `dsh-plugin-whale-pet` (Whale Companion) plugin'inin davranışı referans alındı, üzerine daha çok
etkileşim, duygu ve video desteği eklendi.

## Etkileşimler

| Ne yaparsın | Ne olur |
|---|---|
| **Sol tık** | Rastgele tepki (mutlu, gülme, göz kırpma, utangaç, kibirli, şaşkın, teşekkür, "......" …). Çalışırken "şu an çalışıyorum", uyurken "uyumuyordum!" der |
| **Çift tık** | Sevgi 💙 — kalp atışı animasyonu + uçuşan kalpler |
| **Hızlı 5 tık** | Sinirlenir 💢 (titreme) |
| **Hızlı 7 tık** | Çok sinirlenir, bağırır 🤬 |
| **Hızlı 9 tık** | Küser 😤 — **arkasını döner**, tıklamaları yok sayar |
| **Orta tık (tekerlek tıkı)** | Başını okşa 😳. Küsmüşse **affeder** |
| **Sürükle** | İmlece asılı sallanır (hıza göre sarkaç), hızlı sallarsan panikler 😱, bırakınca teşekkür eder |
| **Tekerlek (scroll)** | Boyutlandırır (%60–%180, ayarlardan kapatılabilir) |
| **Sağ tık** / `Enter` | Ayarlar paneli |
| **Ok tuşları** (`Shift` ile hızlı) | Taşır |
| **Üzerine gel** | Durum balonunu ve emojiyi gösterir |

## DSH oturumlarına tepkileri

| Durum | Görünüm |
|---|---|
| Boşta | Tam boy duruş, nefes animasyonu, ara sıra kendi kendine konuşur (saate göre "Günaydın!", "Gece oldu…") |
| Çalışıyor | "Hadi!" pozu 💪, birden fazla oturumda `×2` sayacı |
| Onay/soru bekliyor | Yalvaran bakış 🥺, balon sürekli açık (en yüksek öncelik) |
| Görev bitti | Zıplama + parıltı ✨ ("Bitti!", "Ben en iyisiyim!") |
| Uzun süre boşta | Uyur 💤 (Zzz), tıklayınca uyanır |
| Bağlantı yok | Sessizce bekler |

Ayarlar: takip kapsamı (tüm oturumlar / açık oturum), boyut, uyku süresi (30 sn / 2 dk / 5 dk / asla),
dil (otomatik / Türkçe / English / 中文), animasyonlar, kendi kendine konuşma, tekerlekle boyutlandırma,
konumu sıfırla, sakla/geri çağır. Tercihler tarayıcının `localStorage`'ında durur.

> **Bilinen sınır:** DSH'nin client tarafı bir turun *neden* bittiğini (başarı / iptal / hata) söylemiyor.
> Bu yüzden "bitti" kutlaması iptal ettiğin turda da çıkabilir. Resmi whale-pet bunu ayırmak için
> ayrıca bir Host köprüsü kuruyor; burada bilinçli olarak sadece client tarafı kullanıldı (daha basit,
> daha az kırılgan, sunucuda kod çalışmaz).

## Kurulum

Plugin'in yapılandırılmış hali (`lib/client.js`) repoda hazır, derlemen gerekmez.

**1) Yerel klasör (en garantisi).** Repoyu klonla, DSH'de **Plugins → Install** alanına klasörün
mutlak yolunu yaz:

```text
/home/inan/My-DeepSeek-Harness-Plugins/deepseek-chan-pet
```

**2) GitHub'dan doğrudan.** DSH kurulumu `pnpm add` ile yapıyor; pnpm alt klasörü şu sözdizimiyle alabiliyor
(DSH sürümüne göre çalışmayabilir, olmazsa 1. veya 3. yolu kullan):

```text
github:inanx12/My-DeepSeek-Harness-Plugins#path:/deepseek-chan-pet
```

**3) tgz paketi.** `npm pack` ile `dsh-plugin-deepseek-chan-0.2.0.tgz` üret, mutlak yolunu kurulum alanına yaz.

Kurduktan sonra sağ altta belirir. Güncellemeden sonra çalışan görevleri bitirip DSH'yi tamamen kapatıp aç.

## Animasyonları video yapmak

**Evet, eklenebiliyor** ve hazır: `assets/videos/<poz>.webm` (veya `.mp4`) koyup `node tools/build.mjs`
çalıştırırsan o poz sprite yerine sessiz, döngülü video olarak oynar. Ayrıntılar
[`assets/videos/README.md`](assets/videos/README.md) içinde. Özet:

- **WebM VP9 + alfa** kullan → arka plan şeffaf. DSH Desktop Chromium tabanlı, bunu sorunsuz oynatıyor.
  MP4/H.264'te alfa yok, karakterin etrafında kutu çıkar.
- Elinde yeşil ekranlı klip varsa: `tools/video-to-webm.sh klip.mp4 happy` (ffmpeg chromakey → VP9 alfa).
- 2–4 sn döngü, ~360 px yükseklik, dosya başına ~300 KB altı. Dosyalar `lib/client.js` içine base64 olarak
  gömülüyor (DSH plugin dosyalarını ayrı URL'den sunmuyor), o yüzden toplam boyutu birkaç MB'da tut.
- Alternatif: video yerine animasyonlu WebP/APNG → `assets/animated/<poz>.webp`.

Poz adları: `idle happy cheer pleading angry smug crying surprised sleepy love shy sulk back proud speechless scheming go panic thanks side furious excited laugh dizzy shocked pout smile nervous bashful smirk thinking confused wink adoring yawn sad`

## Görseller

36 poz var: tam boy duruş, önden/yandan/arkadan pozlar ve 32 sticker duygusu. Sticker kaynakları
repodaki `Emojiler/` klasöründe; `tools/process-art.py` bunları şeffaf sprite'a çeviriyor:

- `Emojiler/eskilerin yüksek çözünürlüklüleri/`: ilk 16 duygunun HD halleri. Alttaki Çince yazı kesiliyor.
- `Emojiler/yeni eklenecek emojiler/`: 16 yeni duygu (çok sinirli, heyecanlı, gülme, başı dönmüş, şok,
  surat asma, gülümseme, gergin, utangaç gülüş, sırıtma, düşünme, kafası karışık, göz kırpma,
  kalp gözler, esneme, üzgün). Beyaz sticker çerçevesi siliniyor.

Yeni bir sticker eklemek için dosyayı bu klasörlerden birine koy, `process-art.py` içindeki tabloya
dosya adı → poz adı satırı ekle, `src/dialogue.js`'e bir duygu ve replik ekle, sonra build al.

## Geliştirme

```sh
python3 tools/process-art.py   # art/source/* + ../Emojiler/* → assets/sprites/*.webp (Pillow + numpy; ~2 dk)
node tools/build.mjs           # src/ + sprite/video → lib/client.js ve preview/index.html
npm test                       # durum makinesi + paket testleri (node:test, bağımlılık yok)
```

`preview/index.html` dosyasını tarayıcıda aç: DSH olmadan çalışan, oturum durumlarını düğmelerle taklit eden
çevrimdışı önizleme.

```
src/dialogue.js   duygular (poz, emoji, animasyon, efekt) + TR/EN/ZH replikler
src/state.js      tercihler, SessionTracker (DSH durum projeksiyonu), PetBrain (öncelik + kombo + uyku)
src/widget.js     shadow-DOM arayüz: sprite/video, balon (daktilo efekti), rozet, sürükleme, panel
src/adapter.js    DSH bağlantısı: shell.overlay slotu, useSessions/useSessionStatus, connection, locale
src/pet.css       animasyonlar ve tema (DSH --dsw-* token'ları)
index.js          Host tarafı (boş — her şey tarayıcıda)
```

## Gizlilik

Sohbet içeriğini okumaz, model çağrısı yapmaz, ek ağ isteği/port/telemetri yok. Sadece DSH'nin verdiği
oturum "çalışıyor / bekliyor" bilgisini kullanır.

## Lisans ve görseller

Kod MIT. **Karakter görselleri MIT değildir**, orijinal sanatçısına aittir (turnaround görselinde
"知乎 @阿落" imzası var). Repoyu herkese açık paylaşmadan veya plugin'i dağıtmadan önce sanatçıdan izin al.
Resmi bir DeepSeek ürünü değildir.
