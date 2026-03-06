/**
 * Seed script - İlk Super Admin oluşturur
 * Çalıştırma: npx wrangler d1 execute sosyoteknik-blog --remote --file=./schema/0001_init.sql
 * Sonra bu script ile hash üretip manuel INSERT yapın veya setup API kullanın.
 *
 * Hash oluşturma için Node'da:
 * node -e "
 * const crypto = require('crypto');
 * const password = 'Admin123!';
 * const salt = crypto.randomBytes(16);
 * crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (e, key) => {
 *   console.log(salt.toString('hex') + ':' + key.toString('hex'));
 * });
 * "
 */

// Bu dosya referans içindir. Gerçek seed için setup API veya wrangler d1 execute kullanılacak.
console.log("Seed: Önce schema/0001_init.sql migration'ını çalıştırın.");
console.log("Sonra /api/setup endpoint'ini (ilk kurulumda) veya admin panelinden kullanıcı ekleyin.");
