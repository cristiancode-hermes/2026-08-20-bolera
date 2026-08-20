#!/usr/bin/env bash
# Bolera QA endpoint smoke — no curl|python pipes
set -euo pipefail
BASE="${1:-http://localhost:3069/api}"
OUT="/opt/data/repositorios/2026-08-20-bolera/scripts/qa-out"
mkdir -p "$OUT"
PASS=0
FAIL=0
note() { echo "$*"; }
ok() { PASS=$((PASS+1)); note "PASS: $*"; }
ko() { FAIL=$((FAIL+1)); note "FAIL: $*"; }

curl -sS -o "$OUT/health.json" -w "%{http_code}" "$BASE/health" > "$OUT/health.code" || true
HC=$(cat "$OUT/health.code")
if [ "$HC" = "200" ]; then ok "health $HC"; else ko "health $HC"; fi

# Login demo
curl -sS -o "$OUT/login.json" -w "%{http_code}" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"demo@bolera.dev","password":"demo1234"}' > "$OUT/login.code" || true
LC=$(cat "$OUT/login.code")
python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
code=open(os.path.join(out,'login.code')).read().strip()
try:
  d=json.load(open(os.path.join(out,'login.json')))
except Exception as e:
  print('LOGIN_PARSE_FAIL',e); sys.exit(0)
tok=d.get('accessToken') or d.get('token') or ''
open(os.path.join(out,'token.txt'),'w').write(tok)
user=d.get('user') or {}
print('LOGIN_CODE',code)
print('TOKEN_LEN',len(tok))
print('USER',user.get('username'),user.get('email'),user.get('role'),'points=',user.get('points'))
open(os.path.join(out,'user.json'),'w').write(json.dumps(user))
PY
TOK=$(cat "$OUT/token.txt" 2>/dev/null || true)
if [ "$LC" = "200" ] || [ "$LC" = "201" ]; then
  if [ -n "$TOK" ]; then ok "login $LC token ok"; else ko "login $LC empty token"; fi
else
  ko "login $LC body=$(head -c 200 $OUT/login.json)"
fi

# Login via username
curl -sS -o "$OUT/login2.json" -w "%{http_code}" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"login":"demo","password":"demo1234"}' > "$OUT/login2.code" || true
L2=$(cat "$OUT/login2.code")
if [ "$L2" = "200" ] || [ "$L2" = "201" ]; then ok "login username $L2"; else ko "login username $L2"; fi

# Register unique
UUID=$(python3 -c 'import uuid;print(uuid.uuid4().hex[:8])')
curl -sS -o "$OUT/reg.json" -w "%{http_code}" -X POST "$BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"qa_${UUID}\",\"email\":\"qa_${UUID}@test.com\",\"password\":\"TestPass123!\"}" > "$OUT/reg.code" || true
RC=$(cat "$OUT/reg.code")
if [ "$RC" = "200" ] || [ "$RC" = "201" ]; then ok "register $RC"; else ko "register $RC $(head -c 120 $OUT/reg.json)"; fi

# me
curl -sS -o "$OUT/me.json" -w "%{http_code}" "$BASE/auth/me" \
  -H "Authorization: Bearer ${TOK}" > "$OUT/me.code" || true
MC=$(cat "$OUT/me.code")
if [ "$MC" = "200" ]; then ok "me $MC"; else ko "me $MC $(head -c 120 $OUT/me.json)"; fi

# me without token
curl -sS -o "$OUT/me401.json" -w "%{http_code}" "$BASE/auth/me" > "$OUT/me401.code" || true
M401=$(cat "$OUT/me401.code")
if [ "$M401" = "401" ]; then ok "me no-token 401"; else ko "me no-token $M401"; fi

# lanes
curl -sS -o "$OUT/lanes.json" -w "%{http_code}" "$BASE/lanes" > "$OUT/lanes.code" || true
LAC=$(cat "$OUT/lanes.code")
python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
d=json.load(open(os.path.join(out,'lanes.json')))
items=d.get('items') if isinstance(d,dict) else d
if not isinstance(items,list): items=[]
print('LANES',len(items),'total',d.get('total') if isinstance(d,dict) else '')
if items:
  open(os.path.join(out,'lane_id.txt'),'w').write(str(items[0]['id']))
PY
if [ "$LAC" = "200" ]; then ok "lanes $LAC"; else ko "lanes $LAC"; fi
LANE_ID=$(cat "$OUT/lane_id.txt" 2>/dev/null || echo 1)

# featured
curl -sS -o "$OUT/feat.json" -w "%{http_code}" "$BASE/lanes/featured" > "$OUT/feat.code" || true
if [ "$(cat $OUT/feat.code)" = "200" ]; then ok "featured"; else ko "featured $(cat $OUT/feat.code)"; fi

# lane detail
curl -sS -o "$OUT/lane.json" -w "%{http_code}" "$BASE/lanes/$LANE_ID" > "$OUT/lane.code" || true
if [ "$(cat $OUT/lane.code)" = "200" ]; then ok "lane detail"; else ko "lane detail $(cat $OUT/lane.code)"; fi

# slots today
DATE=$(python3 -c 'from datetime import datetime; from zoneinfo import ZoneInfo; print(datetime.now(ZoneInfo("Europe/Madrid")).strftime("%Y-%m-%d"))')
curl -sS -o "$OUT/slots.json" -w "%{http_code}" "$BASE/lanes/$LANE_ID/slots?date=$DATE" > "$OUT/slots.code" || true
python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
d=json.load(open(os.path.join(out,'slots.json')))
slots=d.get('slots') if isinstance(d,dict) else d
if not isinstance(slots,list): slots=[]
free=[s for s in slots if s.get('status') in ('free','open') or s.get('state')=='free']
print('SLOTS',len(slots),'free',len(free))
# pick free slot preferably later in day
pick=None
for s in free:
  pick=s
if not pick and slots:
  pick=slots[-1]
if pick:
  open(os.path.join(out,'slot_id.txt'),'w').write(str(pick['id']))
  print('PICK',pick.get('id'),pick.get('startTime'),pick.get('status') or pick.get('state'))
PY
if [ "$(cat $OUT/slots.code)" = "200" ]; then ok "slots"; else ko "slots $(cat $OUT/slots.code)"; fi
SLOT_ID=$(cat "$OUT/slot_id.txt" 2>/dev/null || true)

# menu
curl -sS -o "$OUT/menu.json" -w "%{http_code}" "$BASE/menu" > "$OUT/menu.code" || true
python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
d=json.load(open(os.path.join(out,'menu.json')))
items=d.get('items') if isinstance(d,dict) else d
if not isinstance(items,list): items=[]
print('MENU',len(items))
if items:
  open(os.path.join(out,'addon_id.txt'),'w').write(str(items[0]['id']))
PY
if [ "$(cat $OUT/menu.code)" = "200" ]; then ok "menu"; else ko "menu"; fi
ADDON=$(cat "$OUT/addon_id.txt" 2>/dev/null || true)

# bookings mine
curl -sS -o "$OUT/mine.json" -w "%{http_code}" "$BASE/bookings/mine" \
  -H "Authorization: Bearer ${TOK}" > "$OUT/mine.code" || true
python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
d=json.load(open(os.path.join(out,'mine.json')))
items=d.get('items') if isinstance(d,dict) else d
if not isinstance(items,list): items=[]
print('MINE',len(items),'total',d.get('total') if isinstance(d,dict) else '')
if items:
  open(os.path.join(out,'booking_id.txt'),'w').write(str(items[0]['id']))
  open(os.path.join(out,'booking_total.txt'),'w').write(str(items[0].get('totalCents','')))
PY
if [ "$(cat $OUT/mine.code)" = "200" ]; then ok "bookings/mine"; else ko "bookings/mine $(cat $OUT/mine.code) $(head -c 150 $OUT/mine.json)"; fi
BID=$(cat "$OUT/booking_id.txt" 2>/dev/null || true)

# booking detail list↔detail totals
if [ -n "$BID" ]; then
  curl -sS -o "$OUT/bdet.json" -w "%{http_code}" "$BASE/bookings/$BID" \
    -H "Authorization: Bearer ${TOK}" > "$OUT/bdet.code" || true
  python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
code=open(os.path.join(out,'bdet.code')).read().strip()
d=json.load(open(os.path.join(out,'bdet.json')))
b=d.get('booking') if isinstance(d,dict) and 'booking' in d else d
lines=d.get('lines') if isinstance(d,dict) else None
if lines is None and isinstance(b,dict):
  lines=b.get('lines') or []
total=b.get('totalCents') if isinstance(b,dict) else None
s=sum(int(l.get('qty',1))*int(l.get('unitPriceCents',0)) for l in (lines or []))
lt=open(os.path.join(out,'booking_total.txt')).read().strip()
print('BDET',code,'total',total,'lines_sum',s,'list_total',lt,'qr',bool(d.get('qrSvg') or (b or {}).get('qrSvg')))
open(os.path.join(out,'totals_match.txt'),'w').write('1' if str(total)==str(s) or (not lines and total is not None) else '0')
open(os.path.join(out,'list_detail_match.txt'),'w').write('1' if str(total)==str(lt) else '0')
PY
  if [ "$(cat $OUT/bdet.code)" = "200" ]; then ok "booking detail"; else ko "booking detail"; fi
  if [ "$(cat $OUT/totals_match.txt)" = "1" ]; then ok "lines sum == detail total"; else ko "lines sum != detail total"; fi
  if [ "$(cat $OUT/list_detail_match.txt)" = "1" ]; then ok "list total == detail total"; else ko "list total != detail total"; fi
fi

# points consistency
python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
user=json.load(open(os.path.join(out,'user.json')))
d=json.load(open(os.path.join(out,'mine.json')))
items=d.get('items') if isinstance(d,dict) else d
completed=sum(1 for b in items if b.get('status')=='completed')
# mine may be scoped - check all
print('POINTS_USER',user.get('points'),'COMPLETED_IN_MINE',completed)
PY

# Hold flow on free slot with NEW user to avoid duplicate
REGTOK=$(python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
d=json.load(open(os.path.join(out,'reg.json')))
print(d.get('accessToken') or d.get('token') or '')
PY
)
if [ -n "$SLOT_ID" ] && [ -n "$REGTOK" ]; then
  BODY="{\"partySize\":2,\"shoeSizes\":[42,40],\"addonIds\":[${ADDON:-}],\"bringOwnShoes\":false}"
  # fix empty addon
  if [ -z "$ADDON" ]; then BODY='{"partySize":2,"shoeSizes":[42,40],"bringOwnShoes":false}'; fi
  curl -sS -o "$OUT/hold.json" -w "%{http_code}" -X POST "$BASE/slots/$SLOT_ID/hold" \
    -H "Authorization: Bearer ${REGTOK}" -H 'Content-Type: application/json' \
    -d "$BODY" > "$OUT/hold.code" || true
  HC2=$(cat "$OUT/hold.code")
  python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
code=open(os.path.join(out,'hold.code')).read().strip()
try:
  d=json.load(open(os.path.join(out,'hold.json')))
except Exception:
  d={}
print('HOLD',code,d.get('code') or (d.get('booking') or {}).get('status'), 'expires', (d.get('booking') or d).get('expiresAt'))
b=d.get('booking') or d
if isinstance(b,dict) and b.get('id'):
  open(os.path.join(out,'hold_id.txt'),'w').write(str(b['id']))
  open(os.path.join(out,'hold_expires.txt'),'w').write(str(b.get('expiresAt') or ''))
print('BODY_SNIP',str(d)[:200])
PY
  if [ "$HC2" = "200" ] || [ "$HC2" = "201" ]; then ok "hold $HC2"; else
    # try another free slot if taken
    ko "hold first try $HC2 $(head -c 160 $OUT/hold.json)"
  fi
  HID=$(cat "$OUT/hold_id.txt" 2>/dev/null || true)

  # duplicate same user same slot → 409
  curl -sS -o "$OUT/dup.json" -w "%{http_code}" -X POST "$BASE/slots/$SLOT_ID/hold" \
    -H "Authorization: Bearer ${REGTOK}" -H 'Content-Type: application/json' \
    -d '{"partySize":2,"shoeSizes":[42,40]}' > "$OUT/dup.code" || true
  DC=$(cat "$OUT/dup.code")
  python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
print('DUP',open(os.path.join(out,'dup.code')).read().strip(), open(os.path.join(out,'dup.json')).read()[:180])
PY
  if [ "$DC" = "409" ]; then ok "duplicate user slot 409"; else ko "duplicate expected 409 got $DC"; fi

  # other user hold same slot → 409 SLOT_TAKEN
  curl -sS -o "$OUT/taken.json" -w "%{http_code}" -X POST "$BASE/slots/$SLOT_ID/hold" \
    -H "Authorization: Bearer ${TOK}" -H 'Content-Type: application/json' \
    -d '{"partySize":2,"shoeSizes":[41,39]}' > "$OUT/taken.code" || true
  TC=$(cat "$OUT/taken.code")
  if [ "$TC" = "409" ]; then ok "slot taken other user 409"; else ko "slot taken expected 409 got $TC $(head -c 120 $OUT/taken.json)"; fi

  # confirm
  if [ -n "$HID" ]; then
    curl -sS -o "$OUT/conf.json" -w "%{http_code}" -X POST "$BASE/bookings/$HID/confirm" \
      -H "Authorization: Bearer ${REGTOK}" -H 'Content-Type: application/json' \
      -d '{"paymentMethod":"sim"}' > "$OUT/conf.code" || true
    python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
code=open(os.path.join(out,'conf.code')).read().strip()
d=json.load(open(os.path.join(out,'conf.json')))
b=d.get('booking') or {}
print('CONF',code,b.get('status'),'qrSvg',bool(d.get('qrSvg')),'code',b.get('code'),'email',bool(d.get('emailPreview')))
PY
    CC=$(cat "$OUT/conf.code")
    if [ "$CC" = "200" ] || [ "$CC" = "201" ]; then ok "confirm $CC"; else ko "confirm $CC"; fi
    # check qr
    python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
d=json.load(open(os.path.join(out,'conf.json')))
qr=d.get('qrSvg') or ''
sys.exit(0 if '<svg' in qr else 1)
PY
    if [ $? -eq 0 ]; then ok "QR svg on confirm"; else ko "QR svg missing on confirm"; fi
  fi
fi

# staff login + stats
curl -sS -o "$OUT/staff.json" -w "%{http_code}" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"staff@bolera.dev","password":"demo1234"}' > "$OUT/staff.code" || true
STOK=$(python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
d=json.load(open(os.path.join(out,'staff.json')))
print(d.get('accessToken') or '')
PY
)
curl -sS -o "$OUT/stats.json" -w "%{http_code}" "$BASE/stats/overview" \
  -H "Authorization: Bearer ${STOK}" > "$OUT/stats.code" || true
if [ "$(cat $OUT/stats.code)" = "200" ]; then ok "stats overview"; else ko "stats overview $(cat $OUT/stats.code) $(head -c 100 $OUT/stats.json)"; fi

curl -sS -o "$OUT/rev.json" -w "%{http_code}" "$BASE/stats/revenue-series?days=7" \
  -H "Authorization: Bearer ${STOK}" > "$OUT/rev.code" || true
python3 - "$OUT" <<'PY'
import json,sys,os
out=sys.argv[1]
code=open(os.path.join(out,'rev.code')).read().strip()
d=json.load(open(os.path.join(out,'rev.json')))
pts=d.get('points') if isinstance(d,dict) else d
print('REV',code,'points',len(pts or []), 'sample', (pts or [None])[0])
open(os.path.join(out,'rev_ok.txt'),'w').write('1' if code=='200' and pts else '0')
PY
if [ "$(cat $OUT/rev_ok.txt)" = "1" ]; then ok "revenue series has points"; else ko "revenue series"; fi

# reviews
curl -sS -o "$OUT/revs.json" -w "%{http_code}" "$BASE/lanes/$LANE_ID/reviews" > "$OUT/revs.code" || true
if [ "$(cat $OUT/revs.code)" = "200" ]; then ok "reviews"; else ko "reviews"; fi

# favorites
curl -sS -o "$OUT/fav.json" -w "%{http_code}" -X POST "$BASE/favorites/$LANE_ID" \
  -H "Authorization: Bearer ${TOK}" > "$OUT/fav.code" || true
if [ "$(cat $OUT/fav.code)" = "200" ] || [ "$(cat $OUT/fav.code)" = "201" ]; then ok "favorite toggle"; else ko "favorite $(cat $OUT/fav.code)"; fi

# slot by id
if [ -n "$SLOT_ID" ]; then
  curl -sS -o "$OUT/sid.json" -w "%{http_code}" "$BASE/slots/$SLOT_ID" > "$OUT/sid.code" || true
  if [ "$(cat $OUT/sid.code)" = "200" ]; then ok "slot by id"; else ko "slot by id $(cat $OUT/sid.code)"; fi
fi

echo "==== SUMMARY PASS=$PASS FAIL=$FAIL ===="
[ "$FAIL" -eq 0 ]
