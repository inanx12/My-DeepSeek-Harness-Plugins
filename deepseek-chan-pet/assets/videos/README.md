# Videolar (isteğe bağlı)

**Türkçe** | [English](README.en.md)

Buraya `<poz>.webm` veya `<poz>.mp4` koyarsan o pozun sprite'ı yerine döngülü, sessiz video oynar.
Sonra `node tools/build.mjs` çalıştır.

Poz adları: `idle happy cheer pleading angry smug crying surprised sleepy love shy sulk back proud speechless scheming go panic thanks side furious excited laugh dizzy shocked pout smile nervous bashful smirk thinking confused wink adoring yawn sad`

- **Önerilen:** VP9 + alfa kanallı WebM (şeffaf arka plan). Yeşil ekranlı bir klibi dönüştürmek için:
  `tools/video-to-webm.sh klip.mp4 happy`
- MP4 (H.264) alfa desteklemez: karakterin etrafında kutu görünür.
- Kısa tut (2–4 sn döngü), 320–400 px yükseklik, karakter kadraja sıkı otursun (emoji rozeti kadrajın sağ üstüne konur).
- Hepsi `lib/client.js` içine gömülür: dosya başına ~300 KB altı, toplam birkaç MB'ı geçme.
- Şeffaf animasyon için video yerine `assets/animated/<poz>.webp|gif|png` (animasyonlu WebP/APNG) da kullanabilirsin.
