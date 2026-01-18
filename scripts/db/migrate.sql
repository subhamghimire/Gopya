CREATE TABLE IF NOT EXISTS secrets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  token CHAR(64) NOT NULL UNIQUE,
  encrypted_message BLOB NOT NULL,
  iv VARBINARY(16) NOT NULL,
  salt VARBINARY(32) NOT NULL,
  password_hash VARBINARY(128) NULL,
  failed_attempts INT DEFAULT 0,
  expires_at DATETIME NOT NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expires_at (expires_at),
  INDEX idx_read_at (read_at)
);

