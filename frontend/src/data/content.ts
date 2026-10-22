import { ModeKey } from './modes';

/**
 * Sample captions per mode. In production these come from the AI vision service
 * (see services/captionService). The Environment caption is taken verbatim from
 * the Figma Result_Env frame; the others are representative samples written in
 * the same style (uppercase Indonesian) so the UI renders faithfully offline.
 */
export const SAMPLE_CAPTIONS: Record<ModeKey, string> = {
  environment:
    'PEMANDANGAN UDARA KOTA PADAT DENGAN GEDUNG-GEDUNG PENCAKAR LANGIT DAN SUNGAI DI LATAR BELAKANG PAS LAGI SENJA.',
  people:
    'SEORANG PRIA MENGENAKAN KEMEJA PUTIH DAN DASI HITAM, TERSENYUM MENGHADAP KAMERA DENGAN LATAR DINDING POLOS.',
  document:
    'DOKUMEN RESMI DENGAN KOP SURAT DI BAGIAN ATAS DIIKUTI BEBERAPA PARAGRAF TEKS PADAT DAN TANDA TANGAN DI BAGIAN BAWAH.',
  simple: 'SEBUAH CANGKIR KOPI KERAMIK DI ATAS MEJA KAYU.',
  detail:
    'TUMPUKAN BUAH KELAPA SAWIT BERWARNA MERAH KEORANYEAN TERSUSUN DI ATAS TANAH DI SEBUAH AREA PERKEBUNAN.',
};

/** Default question prompt shown on the VQA "speech" (listening) screen. */
export const VQA_PROMPT = 'Deskripsikan Gambar Tersebut Secara Lebih Detail';

/** Sample VQA answer (replace with the real speech-to-text + AI answer). */
export const VQA_SAMPLE_ANSWER =
  'Penjelasan Yang Lebih Detail Dari Gambar-Gambar Sebelumnya';

/**
 * Settings rows — display only, mirrors the Figma "Setting" frame exactly. The
 * design uses a small repeating set of gold MaterialIcons glyphs (person /
 * privacy-tip / notifications / lock) and shows no per-row values.
 */
export interface SettingItem {
  label: string;
  icon: string; // MaterialIcons name
}

export const SETTINGS_ITEMS: SettingItem[] = [
  { label: 'Language', icon: 'person-outline' },
  { label: 'Voice', icon: 'privacy-tip' },
  { label: 'Camera Auto-Flash', icon: 'notifications-none' },
  { label: 'Pitch', icon: 'lock-outline' },
  { label: 'Default Mode', icon: 'person-outline' },
  { label: 'Gesture Sensitivity', icon: 'privacy-tip' },
  { label: 'History', icon: 'notifications-none' },
];

/** Help screen content — verbatim from the Figma Help frame. */
export const HELP = {
  title: 'Viz2Speech',
  intro:
    'Aplikasi Asisten Pintar Yang Membantu Kamu Memahami Lingkungan Sekitar, Mengenali Orang, Dan Membaca Dokumen Menggunakan Kamera Dan Panduan Suara. Aplikasi Ini Dirancang Agar Mudah Digunakan Hanya Dengan Gestur Sentuhan Tanpa Perlu Melihat Layar.',
  guideHeading: 'Panduan Penggunaan:',
  items: [
    {
      title: 'Mendapatkan Deskripsi Objek',
      body: 'Sentuh Layar 2 Kali. Aplikasi Akan Mengambil Gambar Dari Kamera Belakang Dan Langsung Membacakan Apa Yang Ada Di Depanmu.',
    },
    {
      title: 'Mengganti Mode',
      body: 'Usap (Swipe) Layar Menggunakan 2 Jari. Aplikasi Akan Membacakan Nama Mode Yang Sedang Aktif. Pilihan Mode Yang Tersedia:',
      sub: [
        {
          title: 'Detail Caption',
          body: 'Memberikan Deskripsi Visual Secara Rinci.',
        },
        {
          title: 'Simple Caption',
          body: 'Memberikan Deskripsi Visual Secara Singkat.',
        },
        {
          title: 'Orang',
          body: 'Fokus Untuk Mendeteksi Dan Mengenali Orang Di Depan Kamera.',
        },
        {
          title: 'Lingkungan',
          body: 'Fokus Mendeskripsikan Kondisi Ruangan Atau Tempat.',
        },
        {
          title: 'Document Reading',
          body: 'Membacakan Seluruh Teks Pada Dokumen Secara Utuh.',
        },
      ],
    },
    {
      title: 'Bertanya Lebih Lanjut (Tanya Jawab)',
      body: 'Sentuh Layar Dengan 3 Jari. Gunakan Fitur Ini Untuk Mengajukan Pertanyaan Spesifik Terkait Hasil Deskripsi Terakhir. Misalnya, Jika Deskripsi Menyebutkan Ada Botol Minum, Kamu Bisa Bertanya "Apa Warna Botol Minumnya?".',
    },
  ],
} as const;
