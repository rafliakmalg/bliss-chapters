# BlissChapters API Contract

> *Celebrating Our Moments, Chapter by Chapter*

Backend: AdonisJS 7 + Lucid (PostgreSQL), access-token auth, Drive (S3) untuk foto.
Sumber kebenaran skema: [`backend/database/migrations/1761885935168_create_bliss_tables.ts`](../backend/database/migrations/1761885935168_create_bliss_tables.ts).
Logika skor: [`backend/app/services/scoring.ts`](../backend/app/services/scoring.ts) (dites di `tests/unit/scoring.spec.ts`).

Status implementasi: ✅ = sudah ada di kode & dites, 📝 = kontrak saja.

---

## 0. Konvensi

| Hal | Aturan |
|---|---|
| Base URL | `/api` |
| Auth | `Authorization: Bearer oat_...` (token dari `/api/login`, berlaku 30 hari) |
| Header admin | `X-Admin-Key: <ADMIN_KEY dari .env>` (tidak pakai token user) |
| Format | JSON, `snake_case`. Waktu ISO-8601 dengan offset. |
| Boolean | Kolom status (`active`, `cleared`, `perfect`, `chapter_cleared`) disimpan tinyint 0/1, dikirim sebagai `true/false`. Flag hasil hitungan (`is_locked`, `is_unlocked`, `is_correct`, `is_new_high_score`) bukan kolom, tetap pakai `is_`. |
| List | dibungkus `{ "data": [...] }`. Objek tunggal dikembalikan langsung. |
| Error bisnis | `{ "error": { "code": "SNAKE_CASE_CODE", "message": "...", ...detail } }` |
| Error framework | format default Adonis `{ "errors": [{ "message", "field?", "rule?" }] }` untuk `401` token tidak valid (`"Unauthorized access"`), `422` validasi VineJS, `429` rate limit |
| Rate limit | `/login` & `/login-hint`: 5 req/menit/IP → `429` |

Kode error bisnis: `403 CHAPTER_LOCKED`, `404 NOT_FOUND`, `409 DUPLICATE_SESSION / ALREADY_REDEEMED`, `422 INSUFFICIENT_POINTS / INVALID_ANSWERS`.

---

## 1. Aturan Bisnis (wajib dibaca sebelum implement)

### 1.1 Time-Attack
Konfigurasi per chapter (kolom `events`), dikirim ke client sebagai `game_config`:

| Field | Default | Arti |
|---|---|---|
| `time_limit_seconds` | 75 | Waktu awal (30–300) |
| `time_bonus_seconds` | 3 | + detik tiap jawaban benar |
| `time_penalty_seconds` | 5 | − detik tiap jawaban salah |
| `points_per_correct` | 100 | Poin per jawaban benar |
| `pass_percentage` | 60 | Minimal % benar untuk "tamat" |
| `points_per_second_left` | 5 | Konstanta kode (`POINTS_PER_SECOND_LEFT`) |

**Server replay** (client hanya kirim jawaban mentah + `elapsed_ms` per soal; skor dari client tidak dipercaya):
```
time_left = time_limit
untuk tiap jawaban (urutan dijawab):
    time_left -= elapsed_ms;           kalau <= 0 → stop (jawaban ini tidak dihitung)
    benar ? time_left += bonus : time_left -= penalty;   kalau <= 0 → stop
finished   = semua soal aktif terjawab && time_left > 0
cleared = finished && benar% >= pass_percentage
perfect = cleared && benar == total
score      = benar × points_per_correct + (cleared ? floor(time_left_detik) × 5 : 0)
```
Contoh: 3/3 benar, waktu 20s+15s+15s → sisa 75−50+9 = 34s → skor `300 + 34×5 = 470`.

### 1.2 Best Score & Poin
```
available_points = high_score - points_spent      (per user per chapter)
```
- Submit sesi: `high_score = max(high_score, score)`. `points_spent` **tidak pernah** diubah oleh sesi baru → kupon yang sudah di-redeem tetap sah.
- Skor lebih rendah dari high score tidak mengurangi apa pun.
- DB menjaga `CHECK (points_spent <= high_score)`, jadi saldo tidak mungkin minus.

| Kejadian | high_score | points_spent | available |
|---|---|---|---|
| Sesi 1 skor 470 | 470 | 0 | 470 |
| Redeem kupon 200 | 470 | 200 | 270 |
| Sesi 2 skor 300 | 470 | 200 | 270 |
| Sesi 3 skor 520 | 520 | 200 | 320 |

### 1.3 Achievement (otomatis saat submit)
| trigger_type | Syarat | Reward |
|---|---|---|
| `chapter_completion` | sesi `cleared` | Grand Prize: surat rahasia + galeri foto |
| `perfect_score` | sesi `perfect` (100% benar, tamat) | pesan rahasia |
| `first_try` | `cleared` **dan** ini submit pertama chapter (`attempts_count` sebelumnya = 0) | pesan rahasia |

Insert pakai `ON CONFLICT (user_id, achievement_id) DO NOTHING` → unlock sekali saja. `reward` tidak pernah dikirim sebelum unlock.

### 1.4 Status kupon (dihitung, tidak disimpan)
- `redeemed` → ada baris `user_coupons`
- `available` → `available_points(chapter kupon) >= required_points`
- `locked` → selain itu

### 1.5 Anti double-submit
Client membuat `client_session_id` (`crypto.randomUUID()`) saat sesi dimulai. Kolom ini `UNIQUE`; submit ulang (double tap / retry jaringan) → `409 DUPLICATE_SESSION`, attempts tidak bertambah, jadi First Try tetap adil.

---

## 2. Auth

### ✅ `POST /api/login`
Publik, throttled. Single-user: cukup passcode.

Request
```json
{ "passcode": "141025" }
```
Response `200`
```json
{
  "user": {
    "id": 1,
    "username": "dinda",
    "display_name": "Dinda",
    "created_at": "2026-10-17T10:12:01.512+00:00",
    "updated_at": "2026-10-17T10:12:01.512+00:00"
  },
  "token": {
    "type": "bearer",
    "value": "oat_MQ.cXJ2bG1Tb0x...",
    "expires_at": "2026-11-16T10:20:44.000+00:00"
  }
}
```
Response `401`
```json
{ "error": { "code": "WRONG_PASSCODE", "message": "Hmm, bukan itu sayang 🙈", "hint_available": true } }
```

### ✅ `GET /api/login-hint?level=1`
Publik, throttled. Hint makin jelas tiap level; `level` di atas total → hint terakhir.

Response `200`
```json
{
  "level": 2,
  "total_levels": 3,
  "hint": "Format-nya DDMMYY. Hari pertama kita jalan bareng di Blok M.",
  "next_level": 3
}
```

### ✅ `GET /api/me` · ✅ `POST /api/logout`
Auth. `me` → objek `user` seperti di atas. `logout` → `{ "message": "Logged out successfully" }` (token dihapus).

---

## 3. Events / Chapters

### 📝 `GET /api/events`
Auth. Semua chapter `active`, urut `chapter_number`, beserta progress user.

Response `200`
```json
{
  "data": [
    {
      "id": 1,
      "slug": "dinda-birthday-2026",
      "chapter_number": 1,
      "title": "Chapter 1: Dinda's Birthday Special",
      "description": "Seberapa ingat kamu sama petualangan kita di Blok M dan GI? ...",
      "release_date": "2026-10-16T17:00:00.000+00:00",
      "is_locked": false,
      "game_config": {
        "time_limit_seconds": 75,
        "time_bonus_seconds": 3,
        "time_penalty_seconds": 5,
        "points_per_correct": 100,
        "pass_percentage": 60,
        "points_per_second_left": 5
      },
      "quiz_count": 3,
      "progress": {
        "high_score": 470,
        "points_spent": 200,
        "available_points": 270,
        "attempts_count": 1,
        "chapter_cleared": true,
        "cleared_at": "2026-10-17T12:30:10.000+00:00",
        "last_played_at": "2026-10-17T12:30:10.000+00:00"
      },
      "achievements": { "unlocked": 3, "total": 3 },
      "coupons": { "redeemed": 1, "total": 2 }
    }
  ]
}
```
Belum pernah main → `progress` berisi nol semua (`high_score: 0`, `attempts_count: 0`, `chapter_cleared: false`, tanggal `null`).
`is_locked = !active || release_date > now()`. Chapter terkunci tetap tampil (teaser), tapi endpoint gameplay menolak dengan `403 CHAPTER_LOCKED`.

---

## 4. Quizzes

### 📝 `GET /api/events/:id/quizzes`
Auth. Soal aktif chapter, urutan diacak server. **Tanpa** `correct_option_index` dan `fun_fact`.

Response `200`
```json
{
  "event_id": 1,
  "game_config": { "time_limit_seconds": 75, "time_bonus_seconds": 3, "time_penalty_seconds": 5, "points_per_correct": 100, "pass_percentage": 60, "points_per_second_left": 5 },
  "data": [
    { "id": 2, "location_tag": "Blok M", "question": "Barang apa yang kita hunting di Blok M Square sampai lupa waktu?", "options": ["Piringan hitam", "Kamera analog", "Buku bekas", "Sepatu vintage"] },
    { "id": 3, "location_tag": "Grand Indonesia", "question": "Di GI, kita foto-foto di mana sampai satpam ngelirik?", "options": ["Skybridge", "Depan bioskop", "Taman di West Mall", "Eskalator panjang"] },
    { "id": 1, "location_tag": "Blok M", "question": "Waktu pertama kali jalan ke Blok M, kita makan apa duluan?", "options": ["Mie ayam", "Sate taichan", "Dimsum", "Martabak manis"] }
  ]
}
```
Error: `404 NOT_FOUND`, `403 CHAPTER_LOCKED`.

### 📝 `POST /api/quizzes/:id/check`
Auth. Feedback instan per soal selama time-attack (UI butuh tahu benar/salah untuk bonus/penalti timer). Stateless, tidak mengubah skor. **Client mem-pause timer selama request ini.** Skor final tetap dihitung ulang di `/game-sessions/submit`.

Request
```json
{ "selected_index": 1 }
```
Response `200`
```json
{ "quiz_id": 1, "is_correct": true, "correct_option_index": 1, "fun_fact": "Kamu minta level pedas paling tinggi, terus minum es teh 3 gelas 😂" }
```
Validasi: `selected_index` integer `0..options.length-1`.

---

## 5. Gameplay

### 📝 `POST /api/game-sessions/submit`
Auth. Satu kali di akhir sesi (tamat atau waktu habis).

Request
```json
{
  "event_id": 1,
  "client_session_id": "8f14e45f-ceea-4c6b-9a0e-6c4f1d2b7a11",
  "answers": [
    { "quiz_id": 2, "selected_index": 0, "elapsed_ms": 20000 },
    { "quiz_id": 3, "selected_index": 2, "elapsed_ms": 15000 },
    { "quiz_id": 1, "selected_index": 1, "elapsed_ms": 15000 }
  ]
}
```
Validasi: `client_session_id` uuid; `answers` 0..N item (urut sesuai dijawab); `quiz_id` milik chapter & aktif, tidak dobel; `selected_index ≥ 0`; `elapsed_ms` integer `0..600000` (waktu pause saat `/check` tidak dihitung).

Response `201`
```json
{
  "session": {
    "id": 12,
    "score": 470,
    "correct_count": 3,
    "total_questions": 3,
    "time_left_ms": 34000,
    "cleared": true,
    "perfect": true,
    "results": [
      { "quiz_id": 2, "selected_index": 0, "is_correct": true, "correct_option_index": 0, "fun_fact": "Dan akhirnya kita beli piringan hitam ..." },
      { "quiz_id": 3, "selected_index": 2, "is_correct": true, "correct_option_index": 2, "fun_fact": "Hasil terbaiknya foto ke-47 ..." },
      { "quiz_id": 1, "selected_index": 1, "is_correct": true, "correct_option_index": 1, "fun_fact": "Kamu minta level pedas paling tinggi ..." }
    ]
  },
  "progress": {
    "high_score": 470,
    "previous_high_score": 0,
    "is_new_high_score": true,
    "points_spent": 0,
    "available_points": 470,
    "attempts_count": 1,
    "chapter_cleared": true
  },
  "unlocked_achievements": [
    {
      "id": 1, "title": "Chapter Completion Trophy", "trigger_type": "chapter_completion", "badge_icon": "trophy",
      "reward": { "type": "letter_gallery", "letter": "Selamat ulang tahun, Dinda. ...", "photo_urls": ["https://cdn.../gallery/chapter-1/01.jpg?X-Amz-Signature=..."] }
    },
    { "id": 2, "title": "Memory Master", "trigger_type": "perfect_score", "badge_icon": "brain-heart", "reward": { "type": "message", "message": "Ingatanmu tentang kita ..." } },
    { "id": 3, "title": "First Try Explorer", "trigger_type": "first_try", "badge_icon": "compass", "reward": { "type": "message", "message": "Langsung tamat di percobaan pertama? ..." } }
  ]
}
```
`unlocked_achievements` hanya yang **baru** terbuka di sesi ini (kosong `[]` kalau tidak ada).

Error: `403 CHAPTER_LOCKED`, `409 DUPLICATE_SESSION`, `422 INVALID_ANSWERS` (`quiz_id` asing/dobel).

Alur server (satu transaksi):
1. Load event (404/403) + answer key soal aktif.
2. `scoreSession()` → hasil.
3. `user_progress` `firstOrCreate` lalu `SELECT ... FOR UPDATE`.
4. Insert `game_sessions` (unique `client_session_id` → 409).
5. `earnedTriggers(hasil, attempts_count_lama)`; `applyBestScore()`; `attempts_count += 1`; set `last_played_at`; kalau cleared pertama kali set `chapter_cleared`, `cleared_at`.
6. Insert `user_achievements` untuk achievement chapter dengan trigger tsb, `ON CONFLICT DO NOTHING RETURNING` → itulah `unlocked_achievements`.

---

## 6. Achievements

### 📝 `GET /api/achievements?event_id=1`
Auth. `event_id` opsional (tanpa = semua chapter).

Response `200`
```json
{
  "data": [
    {
      "id": 1, "event_id": 1,
      "title": "Chapter Completion Trophy",
      "description": "Tamatkan Chapter 1 untuk membuka Grand Prize: surat rahasia & galeri foto kita.",
      "badge_icon": "trophy",
      "trigger_type": "chapter_completion",
      "is_unlocked": true,
      "unlocked_at": "2026-10-17T12:30:10.000+00:00",
      "reward": {
        "type": "letter_gallery",
        "letter": "Selamat ulang tahun, Dinda. ...",
        "photo_urls": ["https://cdn.../gallery/chapter-1/01.jpg?X-Amz-Signature=...", "..."]
      }
    },
    {
      "id": 2, "event_id": 1,
      "title": "Memory Master",
      "description": "Jawab 100% benar dalam satu sesi.",
      "badge_icon": "brain-heart",
      "trigger_type": "perfect_score",
      "is_unlocked": false,
      "unlocked_at": null,
      "reward": null
    }
  ]
}
```
`reward.photo_keys` (DB) → `reward.photo_urls` (signed URL Drive, TTL 1 jam). Key mentah tidak dikirim.

---

## 7. Coupons & Redeem

### 📝 `GET /api/coupons?event_id=1`
Auth. `event_id` opsional.

Response `200`
```json
{
  "data": [
    {
      "id": 1, "event_id": 1,
      "title": "Kupon Jajan Blok M Sepuasnya",
      "description": "Satu malam kulineran di Blok M, kamu yang pilih semua menunya, aku yang bayar.",
      "required_points": 200,
      "icon_code": "food-stall",
      "status": "redeemed",
      "points_short": 0,
      "redemption": {
        "redeemed_at": "2026-10-17T13:02:44.000+00:00",
        "points_spent": 200,
        "redeem_note": "Sate taichan level 5, es teh 3 gelas. Lagi.",
        "evidence_photo_url": "https://cdn.../redeems/1/1-clx9k2.jpg?X-Amz-Signature=..."
      }
    },
    {
      "id": 2, "event_id": 1,
      "title": "Kupon Dinner Date Spesial di GI",
      "description": "Dinner di restoran pilihan kamu di Grand Indonesia, lengkap dengan dress code dan bunga.",
      "required_points": 300,
      "icon_code": "candle-dinner",
      "status": "locked",
      "points_short": 30,
      "redemption": null
    }
  ],
  "balances": [ { "event_id": 1, "available_points": 270 } ]
}
```
`points_short = max(0, required_points - available_points)`, untuk UI "kurang 30 poin lagi".

### 📝 `POST /api/coupons/:id/redeem`
Auth. `multipart/form-data`.

| Field | Aturan |
|---|---|
| `photo` | wajib, file `jpg/jpeg/png/webp/heic`, maks 10 MB |
| `note` | wajib, string 1–1000 karakter (catatan kenangan) |

Response `201`
```json
{
  "coupon_id": 1,
  "status": "redeemed",
  "points_spent": 200,
  "available_points": 270,
  "redemption": {
    "redeemed_at": "2026-10-17T13:02:44.000+00:00",
    "redeem_note": "Sate taichan level 5, es teh 3 gelas. Lagi.",
    "evidence_photo_url": "https://cdn.../redeems/1/1-clx9k2.jpg?X-Amz-Signature=..."
  }
}
```
Error:
- `403 CHAPTER_LOCKED`
- `409 ALREADY_REDEEMED`
- `422 INSUFFICIENT_POINTS` → `{ "error": { "code": "INSUFFICIENT_POINTS", "message": "...", "required_points": 300, "available_points": 270 } }`

Alur server (satu transaksi):
1. Validasi multipart (VineJS `vine.file({ size: '10mb', extnames: [...] })`).
2. Lock `user_progress` (user, chapter kupon) `FOR UPDATE`; tidak ada → available 0.
3. Sudah ada `user_coupons` → 409. `available < required` → 422.
4. `photo.moveToDisk('redeems/{user_id}/{coupon_id}-{cuid}.{ext}')`.
5. Insert `user_coupons` (`points_spent` = snapshot `required_points`), `user_progress.points_spent += required_points`, commit.
6. Gagal setelah langkah 4 → hapus file dari Drive lalu lempar error.

Yang disimpan di DB adalah **key** (`evidence_photo_key`), bukan URL: bucket bisa privat, URL di-sign saat dibaca.

---

## 8. Admin / Testing

### 📝 `POST /api/admin/reset-progress`
Header `X-Admin-Key` (dibandingkan dengan `safeEqual` dari `@adonisjs/core/helpers`). Tidak butuh token user.

Request
```json
{ "event_id": 1, "delete_photos": false }
```
- `event_id` opsional: tanpa = reset semua chapter.
- `delete_photos` default `false`: foto kenangan **tidak** ikut dihapus dari storage; key-nya dikembalikan di `kept_photo_keys` supaya bisa dipulihkan.

Yang dihapus (scope user + chapter): `user_achievements`, `user_coupons`, `game_sessions`, `user_progress`. Chapter kembali ke kondisi *unplayed* (First Try bisa didapat lagi). Master data (soal, kupon, achievement) tidak disentuh.

Response `200`
```json
{
  "scope": "event:1",
  "deleted": { "user_achievements": 3, "user_coupons": 1, "game_sessions": 4, "user_progress": 1 },
  "photos_deleted": 0,
  "kept_photo_keys": ["redeems/1/1-clx9k2.jpg"]
}
```
Error: `401 INVALID_ADMIN_KEY`, `404 NOT_FOUND` (event).

Reset total termasuk master data: `node ace migration:fresh --seed` (dari `database/data/mock_data.json`).

---

## 9. Ringkasan Route

| Method | Path | Auth | Status |
|---|---|---|---|
| POST | `/api/login` | publik + throttle | ✅ |
| GET | `/api/login-hint` | publik + throttle | ✅ |
| GET | `/api/me` | token | ✅ |
| POST | `/api/logout` | token | ✅ |
| GET | `/api/events` | token | 📝 |
| GET | `/api/events/:id/quizzes` | token | 📝 |
| POST | `/api/quizzes/:id/check` | token | 📝 |
| POST | `/api/game-sessions/submit` | token | 📝 |
| GET | `/api/achievements` | token | 📝 |
| GET | `/api/coupons` | token | 📝 |
| POST | `/api/coupons/:id/redeem` | token | 📝 |
| POST | `/api/admin/reset-progress` | `X-Admin-Key` | 📝 |

---

## 10. Perubahan dari Rancangan Awal

| Rancangan awal | Sekarang | Alasan |
|---|---|---|
| FK `integer().unsigned()` nullable | `notNullable()` + index | Postgres abaikan `unsigned`; FK nullable bikin baris yatim. Postgres tidak auto-index FK. |
| `json` | `jsonb` + `CHECK correct_option_index < jsonb_array_length(options)` | Index jawaban tidak mungkin di luar opsi. |
| `user_coupons.status` locked/available/redeemed | Baris hanya saat redeemed; status dihitung | Status tersimpan pasti basi tiap high score berubah. |
| `user_coupons` tanpa unique | `UNIQUE(user_id, coupon_id)` + snapshot `points_spent` | Cegah redeem dobel; audit kalau harga kupon diubah. |
| `evidence_photo_url` | `evidence_photo_key` (wajib) + `redeem_note` wajib | Bucket privat + signed URL; bukti adalah syarat redeem. |
| `coupon_id ON DELETE CASCADE` | `RESTRICT` | Hapus kupon tidak boleh diam-diam menghapus foto kenangan. |
| `has_played_before` | `attempts_count` + `cleared_at` | First Try butuh hitungan; boolean tidak cukup. |
| `is_active`, `is_chapter_cleared`, ... boolean | `active`, `chapter_cleared`, `cleared`, `perfect` tinyint 0/1 + `CHECK (x IN (0,1))` | Standar: tanpa prefix `is_`, tipe tinyint (di Postgres jadi `SMALLINT`). Model Lucid membacanya sebagai boolean, jadi API tetap `true/false`. |
| Urutan kolom bebas | timestamp → ids → kolom lain → status, masing-masing alfabet | Standar urutan kolom. |
| — | `CHECK (points_spent <= high_score)` | `available_points` tidak bisa minus walau ada bug. |
| — | Tabel `game_sessions` (`client_session_id` UNIQUE) | Riwayat skor + anti double-submit. |
| `reward_content` text | `reward` jsonb (`letter`, `message`, `photo_keys`) | Grand Prize butuh surat + galeri. |
| `trigger_type` string bebas | enum (CHECK) + `UNIQUE(event_id, trigger_type)` | Typo trigger langsung ditolak DB. |
| — | `events.chapter_number`, `time_*`, `points_per_correct`, `pass_percentage` | Konfigurasi time-attack per chapter. |
| — | `users.login_hints` jsonb | Sumber `/login-hint`. |
| — | `auth_access_tokens`, `rate_limits` | Dibutuhkan auth & limiter Adonis. |
| `timestamp('created_at')` | `timestamptz NOT NULL DEFAULT now()` | Zona waktu tersimpan; default di DB. |
