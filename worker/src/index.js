const TIME_SLOTS = ['6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'];
const MAX_ADVANCE_DAYS = 14;
const PENDING_EXPIRY_HOURS = 4;
const ALLOWED_ORIGINS = new Set([
  'https://southcoastpickleball.pages.dev',
  'http://localhost:8934',
]);

function corsHeaders(origin) {
  const allowed = origin && (ALLOWED_ORIGINS.has(origin) || origin.endsWith('.southcoastpickleball.pages.dev'));
  const headers = { 'Vary': 'Origin' };
  if (allowed) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  }
  return headers;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function isDateWithinBookingWindow(dateStr) {
  const today = todayStr();
  if (dateStr < today) return false;
  const max = new Date();
  max.setUTCDate(max.getUTCDate() + MAX_ADVANCE_DAYS);
  return dateStr <= max.toISOString().slice(0, 10);
}

function isAdminAuthed(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return !!env.ADMIN_PASSWORD && token === env.ADMIN_PASSWORD;
}

// Shared by the public and admin create paths: active bookings (confirmed,
// or pending and not yet expired) on this court/date whose slot range
// overlaps [startIdx, startIdx + hours). excludeId lets an admin edit skip
// comparing a row against itself.
async function findCourtConflict(env, date, court, startIdx, hours, excludeId) {
  const { results } = await env.DB.prepare(
    `SELECT id, time_slot, hours FROM bookings
     WHERE date = ? AND booking_type = 'court' AND court = ?
       AND (status = 'confirmed' OR (status = 'pending' AND created_at > datetime('now', ?)))`
  ).bind(date, court, `-${PENDING_EXPIRY_HOURS} hours`).all();

  const newEnd = startIdx + hours;
  for (const row of results) {
    if (excludeId && row.id === excludeId) continue;
    const existingStart = TIME_SLOTS.indexOf(row.time_slot);
    const existingEnd = existingStart + row.hours;
    if (existingStart < newEnd && startIdx < existingEnd) return true;
  }
  return false;
}

function validateBookingBody(body) {
  const { date, timeSlot, bookingType, name, phone, paymentMethod } = body;
  const hours = Math.max(1, Math.min(6, parseInt(body.hours, 10) || 1));
  const court = bookingType === 'court' ? parseInt(body.court, 10) : 0;
  const startIdx = TIME_SLOTS.indexOf(timeSlot);

  if (!isValidDate(date)) return { error: 'Invalid or missing date.' };
  if (startIdx === -1) return { error: 'Invalid time slot.' };
  if (startIdx + hours > TIME_SLOTS.length) return { error: 'That duration runs past closing time (12 AM).' };
  if (bookingType !== 'openplay' && bookingType !== 'court') return { error: 'Invalid booking type.' };
  if (bookingType === 'court' && (court !== 1 && court !== 2)) return { error: 'Please select Court 1 or Court 2.' };
  if (!name || !String(name).trim() || !phone || !String(phone).trim() || !paymentMethod) {
    return { error: 'Name, phone, and payment method are required.' };
  }
  return { date, timeSlot, startIdx, hours, court, bookingType, name: String(name).trim(), phone: String(phone).trim(), paymentMethod };
}

async function handleAvailability(url, env, origin) {
  const date = url.searchParams.get('date') || '';
  if (!isValidDate(date)) {
    return json({ error: 'Invalid or missing date (expected YYYY-MM-DD).' }, 400, origin);
  }
  const { results } = await env.DB.prepare(
    `SELECT time_slot, hours, court FROM bookings
     WHERE date = ? AND booking_type = 'court'
       AND (status = 'confirmed' OR (status = 'pending' AND created_at > datetime('now', ?)))`
  ).bind(date, `-${PENDING_EXPIRY_HOURS} hours`).all();

  const courts = { '1': [], '2': [] };
  for (const row of results) {
    const startIdx = TIME_SLOTS.indexOf(row.time_slot);
    if (startIdx === -1) continue;
    const courtKey = String(row.court);
    if (!courts[courtKey]) continue;
    for (let i = startIdx; i < Math.min(startIdx + row.hours, TIME_SLOTS.length); i++) {
      if (!courts[courtKey].includes(TIME_SLOTS[i])) courts[courtKey].push(TIME_SLOTS[i]);
    }
  }
  return json({ date, courts }, 200, origin);
}

async function handleCreateBooking(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400, origin);
  }

  const v = validateBookingBody(body);
  if (v.error) return json({ error: v.error }, 400, origin);
  if (!isDateWithinBookingWindow(v.date)) {
    return json({ error: `Bookings are only open for the next ${MAX_ADVANCE_DAYS} days.` }, 400, origin);
  }

  if (v.bookingType === 'court' && await findCourtConflict(env, v.date, v.court, v.startIdx, v.hours)) {
    return json({ error: `Court ${v.court} is already booked for part of that time. Pick another court or time.` }, 409, origin);
  }

  const insert = await env.DB.prepare(
    `INSERT INTO bookings (date, time_slot, hours, court, booking_type, name, phone, payment_method, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).bind(v.date, v.timeSlot, v.hours, v.court, v.bookingType, v.name, v.phone, v.paymentMethod).run();

  return json({ id: insert.meta.last_row_id, status: 'pending' }, 201, origin);
}

async function handleAdminList(url, env, origin) {
  const date = url.searchParams.get('date');
  const stmt = date && isValidDate(date)
    ? env.DB.prepare(`SELECT * FROM bookings WHERE date = ? ORDER BY time_slot, court`).bind(date)
    : env.DB.prepare(`SELECT * FROM bookings WHERE date >= ? ORDER BY date, time_slot LIMIT 200`).bind(todayStr());
  const { results } = await stmt.all();
  return json({ bookings: results }, 200, origin);
}

// Admin-entered bookings (phone-in / walk-up players) skip the public
// 14-day self-serve window — the owner is taking the request directly —
// and land straight in 'confirmed' status since there's no online payment
// step waiting on confirmation.
async function handleAdminCreate(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400, origin);
  }
  const v = validateBookingBody(body);
  if (v.error) return json({ error: v.error }, 400, origin);

  if (v.bookingType === 'court' && await findCourtConflict(env, v.date, v.court, v.startIdx, v.hours)) {
    return json({ error: `Court ${v.court} is already booked for part of that time.` }, 409, origin);
  }

  const insert = await env.DB.prepare(
    `INSERT INTO bookings (date, time_slot, hours, court, booking_type, name, phone, payment_method, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
  ).bind(v.date, v.timeSlot, v.hours, v.court, v.bookingType, v.name, v.phone, v.paymentMethod).run();

  return json({ id: insert.meta.last_row_id, status: 'confirmed' }, 201, origin);
}

async function handleAdminUpdate(id, request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400, origin);
  }
  if (!['confirmed', 'cancelled', 'pending'].includes(body.status)) {
    return json({ error: 'Invalid status.' }, 400, origin);
  }
  const result = await env.DB.prepare(`UPDATE bookings SET status = ? WHERE id = ?`).bind(body.status, id).run();
  if (!result.meta.changes) return json({ error: 'Booking not found.' }, 404, origin);
  return json({ ok: true }, 200, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }
      if (url.pathname === '/api/availability' && request.method === 'GET') {
        return await handleAvailability(url, env, origin);
      }
      if (url.pathname === '/api/bookings' && request.method === 'POST') {
        return await handleCreateBooking(request, env, origin);
      }

      // Everything under /api/admin/ requires the admin bearer token.
      if (url.pathname.startsWith('/api/admin/')) {
        if (!isAdminAuthed(request, env)) return json({ error: 'Unauthorized.' }, 401, origin);
        if (url.pathname === '/api/admin/bookings' && request.method === 'GET') {
          return await handleAdminList(url, env, origin);
        }
        if (url.pathname === '/api/admin/bookings' && request.method === 'POST') {
          return await handleAdminCreate(request, env, origin);
        }
        const idMatch = url.pathname.match(/^\/api\/admin\/bookings\/(\d+)$/);
        if (idMatch && request.method === 'PATCH') {
          return await handleAdminUpdate(Number(idMatch[1]), request, env, origin);
        }
      }

      return json({ error: 'Not found.' }, 404, origin);
    } catch (e) {
      // Any uncaught error here would otherwise fall through to the
      // Workers runtime's own error response, which carries no CORS
      // headers — the browser then reports a confusing "blocked by CORS
      // policy" instead of the real (server) error.
      return json({ error: 'Server error — please try again.' }, 500, origin);
    }
  },
};
