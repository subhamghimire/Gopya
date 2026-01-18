#!/usr/bin/env bash
set -euo pipefail

# Run expired secret cleanup via SQL. Assumes env vars for mysql CLI.
mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" "-p${DB_PASSWORD:-}" "${DB_NAME:-gopya}" <<'SQL'
DELETE FROM secrets WHERE (expires_at <= NOW()) OR (read_at IS NOT NULL);
SQL

