-- admin_users — owner accounts for the dashboard's server-side login (auth_api.php).
-- Passwords are bcrypt hashes (password_hash / password_verify), never plaintext.
--
-- RUN THIS ONCE on every environment (local + Railway/production) before the
-- dashboard can log in. It is NOT included in the app's regular data dumps.
--
--   Local:  C:\xampp\mysql\bin\mysql.exe -u root clansmachina < admin_users.sql
--   Railway: pipe it into the MySQL plugin (or paste in its Query tab).

CREATE TABLE IF NOT EXISTS admin_users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL DEFAULT 'Owner',
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed the first owner. Do NOT hardcode a password here (this file is committed).
-- Generate a hash for a password YOU choose and insert it, e.g.:
--
--   php -r "echo password_hash('your-strong-password', PASSWORD_DEFAULT);"
--
-- then:
--
--   INSERT INTO admin_users (name, email, password_hash)
--   VALUES ('Your Name', 'you@example.com', '<paste-the-hash-here>');
--
-- After first login you can change the password from the dashboard (Profile).
