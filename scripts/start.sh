#!/bin/sh
# تشغيل الإنتاج: يطبّق تحديثات قاعدة البيانات، يتأكد من حساب المشرف، ثم يشغّل الخادم.
set -e
mkdir -p "${UPLOAD_DIR:-/data/uploads}"
npx prisma migrate deploy
npx tsx prisma/seed.ts
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
