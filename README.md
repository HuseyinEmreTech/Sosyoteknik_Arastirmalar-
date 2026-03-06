# Sosyoteknik Araştırmalar - Blog Platformu

Cloudflare Pages, D1 ve R2 kullanan çoklu admin destekli blog platformu.

## Özellikler

- Karanlık / aydınlık mod
- Rol tabanlı yetkilendirme (Süper Admin, Admin, Üye)
- Blog yazıları (CRUD), markdown desteği
- Anasayfa: sol sidebar yazarlar, kart grid blog listesi
- Admin paneli: yazı yönetimi, istatistikler (sadece süper admin), kullanıcı listesi

## Kurulum

1. Bağımlılıkları yükleyin: `npm install`

2. Cloudflare hesabında D1 veritabanı oluşturun:
   ```bash
   npx wrangler d1 create sosyoteknik-blog
   ```

3. `wrangler.jsonc` içindeki `YOUR_D1_DATABASE_ID` değerini D1 ID ile değiştirin.

4. R2 bucket oluşturun: `wrangler r2 bucket create sosyoteknik-images`

5. KV namespace oluşturun (Astro session için): `wrangler kv namespace create SESSION`  
   Çıkan ID'yi wrangler.jsonc içindeki `YOUR_KV_NAMESPACE_ID` ile değiştirin.

7. Migration'ı çalıştırın:
   ```bash
   npm run db:migrate
   ```

6. İlk Super Admin oluşturun (sadece hiç kullanıcı yokken):
   ```bash
   curl -X POST https://your-site.com/api/setup -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"GucluSifre123","displayName":"Admin"}'
   ```

9. Production için `JWT_SECRET` ve `ENABLE_SETUP=false` ayarlayın:
   ```bash
   npx wrangler secret put JWT_SECRET
   ```

## Geliştirme

```bash
npm run dev       # Yerel sunucu (localhost:4321)
npm run build     # Production build
npm run preview   # Build önizleme
```

## Deployment

GitHub repo'yu Cloudflare Pages'e bağlayın veya:

```bash
npm run build
npx wrangler pages deploy dist
```

## Dosya Yapısı

- `src/pages/api/` - API route'ları (auth, posts, authors, stats, users)
- `src/pages/blog/` - Blog anasayfa ve detay
- `src/pages/admin/` - Admin paneli
- `schema/` - D1 migration SQL
