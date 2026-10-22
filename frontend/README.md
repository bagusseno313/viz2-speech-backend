How to Run :

Prereq :

npx expo install expo-dev-client

(to compile/dev on device)

```
# compile
npm install expo

npm install expo-splash-screen

npx expo run:android

# if u want spesify target name

npx expo run:android --device {{device_name}}

npx expo start
```

If u have android studio and android device :

On same terminal, press `a`

Prereq :

use npm install

- expo
- eas

Build app command :

```cmd
eas build -p android --profile preview
```

## Rekomendasi stack AI untuk TA yang relevan

Untuk aplikasi yang berbasis suara dan aksesibilitas bagi penyandang disabilitas netra, arsitektur yang paling realistis adalah:

- Image Captioning / VLM: Qwen2.5-VL-7B-Instruct atau LLaVA 1.6 / 1.7
  - Cocok untuk interpretasi gambar yang lebih natural dan deskripsi yang lebih pandai.
  - Pilihan aman untuk backend lokal atau server GPU.
- OCR: PaddleOCR
  - Sangat kuat untuk dokumen, teks di label, papan, dan halaman cetak.
  - Ideal untuk mode dokumen dan mode detail.
- TTS: XTTS-v2 atau Piper TTS
  - XTTS-v2 lebih bagus untuk kualitas suara natural dan multi-bahasa.
  - Piper cocok kalau mau lightweight dan offline.
- STT / VQA: Whisper atau Gemini / LLM vision + speech pipeline
  - STT untuk pertanyaan lisan, lalu gabungkan dengan caption terakhir untuk VQA.

### Flow aplikasi yang benar

1. User mengambil foto dari kamera.
2. Aplikasi mengirim foto ke backend AI dengan mode aktif.
3. Backend memanggil model VLM / OCR sesuai mode.
4. Hasil caption dikembalikan ke aplikasi.
5. Aplikasi membacakan hasil caption menggunakan TTS.
6. Untuk pertanyaan lanjutan, user berkata, hasil STT dikirim bersama konteks caption terakhir ke backend VQA.

### Kontrak endpoint backend yang sudah disiapkan

Aplikasi ini sekarang mendukung kontrak berikut:

- POST /api/caption
  - multipart/form-data
  - field: mode, prompt, image
- POST /api/vqa
  - JSON
  - body: { question, caption, mode }

Nilai default untuk `EXPO_PUBLIC_AI_API_URL` adalah `http://localhost:8000`, tetapi di Android emulator / device real sebaiknya diubah menjadi host yang benar, misalnya:

- Android emulator: `http://10.0.2.2:8000`
- Device real: `http://192.168.1.x:8000`

Gunakan file `.env` seperti berikut:

```bash
EXPO_PUBLIC_AI_API_URL=http://10.0.2.2:8000
EXPO_PUBLIC_USE_FAKE_AI=false
```

### Catatan integrasi penting

- Mode `document` sebaiknya mengutamakan OCR dulu, lalu gabungkan hasil OCR dengan prompt captioning ringkas.
- Mode `people` sebaiknya memakai VLM dengan prompt fokus objek manusia, ekspresi, pakaian, aktivitas.
- Mode `environment` fokus pada lingkungan sekitar, arah, elemen utama, dan kondisi ruang.
- Mode `simple` harus menyediakan output sangat pendek agar cepat dipahami pengguna tunanetra.
- Mode `detail` dapat mengembalikan deskripsi lebih halus tetapi tetap singkat dan jelas saat dibacakan.

### Kesimpulan

Aplikasi mobile UI sudah ada dan berfungsi dengan flow yang benar. Yang masih dibutuhkan adalah backend AI-nya: VLM untuk caption, OCR untuk dokumen, dan model TTS modern untuk output suara. Dengan arsitektur seperti ini, proposal TA dapat dibawa ke bimbingan dengan argument yang lebih kuat dan teknis.
