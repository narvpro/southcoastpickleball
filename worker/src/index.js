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
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
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

  const { date, timeSlot, bookingType, name, phone, paymentMethod } = body;
  const hours = Math.max(1, Math.min(6, parseInt(body.hours, 10) || 1));
  const court = bookingType === 'court' ? parseInt(body.court, 10) : 0;

  if (!isValidDate(date) || !isDateWithinBookingWindow(date)) {
    return json({ error: `Bookings are only open for the next ${MAX_ADVANCE_DAYS} days.` }, 400, origin);
  }
  const startIdx = TIME_SLOTS.indexOf(timeSlot);
  if (startIdx === -1) {
    return json({ error: 'Invalid time slot.' }, 400, origin);
  }
  if (startIdx + hours > TIME_SLOTS.length) {
    return json({ error: 'That duration runs past closing time (12 AM).' }, 400, origin);
  }
  if (bookingType !== 'openplay' && bookingType !== 'court') {
    return json({ error: 'Invalid booking type.' }, 400, origin);
  }
  if (bookingType === 'court' && (court !== 1 && court !== 2)) {
    return json({ error: 'Please select Court 1 or Court 2.' }, 400, origin);
  }
  if (!name || !String(name).trim() || !phone || !String(phone).trim() || !paymentMethod) {
    return json({ error: 'Name, phone, and payment method are required.' }, 400, origin);
  }

  if (bookingType === 'court') {
    const { results } = await env.DB.prepare(
      `SELECT time_slot, hours FROM bookings
       WHERE date = ? AND booking_type = 'court' AND court = ?
         AND (status = 'confirmed' OR (status = 'pending' AND created_at > datetime('now', ?)))`
    ).bind(date, court, `-${PENDING_EXPIRY_HOURS} hours`).all();

    const newEnd = startIdx + hours;
    for (const row of results) {
      const existingStart = TIME_SLOTS.indexOf(row.time_slot);
      const existingEnd = existingStart + row.hours;
      if (existingStart < newEnd && startIdx < existingEnd) {
        return json({ error: `Court ${court} is already booked for part of that time. Pick another court or time.` }, 409, origin);
      }
    }
  }

  const insert = await env.DB.prepare(
    `INSERT INTO bookings (date, time_slot, hours, court, booking_type, name, phone, payment_method, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).bind(date, timeSlot, hours, court, bookingType, String(name).trim(), String(phone).trim(), paymentMethod).run();

  return json({ id: insert.meta.last_row_id, status: 'pending' }, 201, origin);
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
