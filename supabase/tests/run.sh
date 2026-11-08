#!/usr/bin/env bash
# Run the database tests on a throwaway local Postgres (16+). No Supabase needed.
#   bash supabase/tests/run.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)}"
WORK="${WORK:-/var/lib/postgresql/taach-tests}"
as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
as_pg "rm -rf $WORK && mkdir -p $WORK && $PGBIN/initdb -D $WORK/data -A trust >/dev/null && $PGBIN/pg_ctl -D $WORK/data -o '-k $WORK -p 5498 -c listen_addresses=' -l $WORK/log start >/dev/null"
trap 'as_pg "$PGBIN/pg_ctl -D $WORK/data stop -m fast >/dev/null"' EXIT
cp "$HERE"/*.sql "$HERE"/../migrations/*.sql "$HERE"/../seed.sql "$WORK"/ && chown -R postgres "$WORK" 2>/dev/null || true
P="psql -h $WORK -p 5498 -v ON_ERROR_STOP=1 -q"
MIGS="$(cd "$HERE/../migrations" && ls *.sql | sed "s#^#-f $WORK/#" | tr '\n' ' ')"
GRANTS="grant usage on schema public to anon, authenticated; grant select,insert,update,delete on all tables in schema public to anon, authenticated;"
for db in schema market; do
  as_pg "$P -c 'create database $db'"
  as_pg "$P -d $db -f $WORK/supabase_stub.sql -c \"alter default privileges in schema public grant select,insert,update,delete on tables to anon, authenticated; grant usage on schema public to anon, authenticated;\" $MIGS"
done
as_pg "$P -d schema -f $WORK/seed.sql"
as_pg "psql -h $WORK -p 5498 -d schema -Atc \"select 'seed: ' || (select count(*) from categories) || ' categories, ' || (select count(*) from sizes) || ' sizes, ' || (select count(*) from brands) || ' brands'\""
echo "migrations applied"
echo "-- schema_test.sql (each T line is followed by its expected result or error)"
as_pg "psql -h $WORK -p 5498 -d schema -q -f $WORK/schema_test.sql 2>&1" | grep -cE "^T[0-9]" | sed 's/^/   checks run: /'
echo "-- marketplace_test.sql"
as_pg "$P -d market -f $WORK/marketplace_test.sql -At"
