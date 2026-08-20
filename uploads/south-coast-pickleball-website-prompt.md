# South Coast Pickleball Leisure Hub — Website Design & Build Brief

> Paste this into **Claude Design** to generate the visual concept, then hand the exported design + this brief to **Claude Code** to build the production site. Everything below is factual/source content — treat the "Visual Direction" as adjustable, but keep all names, numbers, and locations exact.

---

## 1. Project Goal
Build a modern, mobile-first marketing website for **South Coast Pickleball Leisure Hub**, a pickleball facility in Poblacion, Santa Maria, Davao Occidental, Philippines. The primary job of the site is to **drive court bookings** (open play) and make it dead-simple to contact the hub. The build should be flexible for future modules (online payments, memberships, tournaments, e-commerce for paddles/merch).

**Primary calls to action:** Book a court · Call/Message us
**Audience:** Local players and visitors in the Davao Occidental / Santa Maria area.

---

## 2. Brand Identity
- **Name:** South Coast Pickleball Leisure Hub
- **Tagline (from flyer):** "See you on the court!"
- **Personality:** Energetic, tropical, welcoming, premium-but-affordable. Beach-leisure meets serious play.
- **Sport:** Pickleball (open play format)

---

## 3. Visual Direction
Match the flyer's identity (screenshots on hand):

- **Color palette**
  - Deep purple (background/base): `#4A1B6D` → `#5B2A86`
  - Magenta / hot pink (primary accent, buttons, highlights): `#EC2D8F` / `#FF3D9A`
  - Lilac / lavender (court surface tone, secondary): `#9B72CF` / `#B18FCF`
  - White for headings/body on dark
  - Optional bright accent (pickleball ball): lime-yellow `#C6D600`
  - Use a **purple→magenta gradient** as the signature background, like the flyer.
- **Typography**
  - Display/hero: bold, energetic sans (heavy weight, uppercase) — e.g. Montserrat/Poppins ExtraBold
  - Script accent for phrases like "South Coast" and "See you on the court!" — a flowing script font
  - Body: clean, readable sans
- **Imagery/mood:** Tropical — palm trees, coconut, blue sky, outdoor court with green turf surround and purple/lilac playing surface. Sunny, vibrant, leisure vibe.
- **Style:** Rounded pill buttons, soft cards, generous spacing, subtle glow/shadow. Feels like the flyer come to life.

---

## 4. Site Structure (single-page or multi-section)
Start as a polished one-pager with anchor navigation; keep it componentized so pages can be split out later.

1. **Hero** — Logo/name, tagline "See you on the court!", hero image of the court with palms, primary buttons: **Book Now** and **Call 0909 471 6666**.
2. **Open Play banner** — big, punchy, flyer-style:
   - Hours: **6 PM – 12 AM**
   - Rate: **₱100 only**
   - Note: **Limited — for players only**
3. **Booking** — Manual booking OR online booking. Show two clear rates: **Open Play ₱100** (per player) and **Court Booking ₱250 per hour** (rent the court). Include a booking form (name, phone, date, time slot, hours, number of players) and a prominent "Message us on Facebook" option. (See §6 for booking behavior.)
4. **About / The Hub** — Short blurb about the facility, the vibe, the court (purple/lilac surface, tropical setting).
5. **Partners / Brands** — Logo strip: **JOOLA · Paddletek · Selkirk · Franklin** (as shown courtside).
6. **Location** — Address + embedded map:
   - **Poblacion, Santa Maria, Davao Occidental**, Jassie Street
   - "Along the street going to Boracay"
   - "Previously the Banana Chips Warehouse"
7. **Contact / Footer** — Phone, Facebook page link, hours, copyright.

---

## 5. Exact Content (do not alter)
- **Business:** South Coast Pickleball Leisure Hub
- **Offering:** Open Play
- **Hours:** 6:00 PM – 12:00 AM
- **Open Play price:** ₱100 only (per player)
- **Court booking price:** ₱250 per hour (court rental)
- **Restriction:** Limited — for players only
- **Booking:** Manual booking or online booking
- **Phone:** 0909 471 6666 (tel link: `tel:+639094716666`)
- **Facebook Page:** "South Coast Pickleball Leisure Hub" (message for inquiries)
- **Address:** Poblacion, Santa Maria, Davao Occidental, Philippines — Jassie Street (along the street going to Boracay), formerly Banana Chips Warehouse
- **Tagline:** See you on the court!
- **Courtside partner brands:** JOOLA, Paddletek, Selkirk, Franklin

---

## 6. Booking Behavior (build note for Claude Code)
Design the booking section as a **module** so it can grow:
- **Phase 1 (launch):** Booking form submits to email and/or opens a pre-filled Facebook Messenger / WhatsApp / SMS message with the requested slot. No payment yet. Also show the "Call" and "Message on FB" fallbacks prominently since manual booking is offered.
- **Rates in the form:** support both pricing types — **Open Play (₱100/player)** and **Court Booking (₱250/hour)**. If a user picks court booking, calculate total from hours selected (e.g. 2 hrs = ₱500).
- **Phase 2 (upgrade-ready):** Structure the form + slot data so it can later plug into a real booking/calendar backend and online payments (e.g. GCash/Maya/Stripe). Keep the schedule (6 PM–12 AM slots) and rates data-driven, not hard-coded into markup.

---

## 7. Technical Requirements (Claude Code handoff)
- **Mobile-first, fully responsive** (most traffic will be phones — the source is a FB story).
- **Fast & lightweight** (Philippine mobile data — optimize images, lazy-load).
- **Accessibility:** semantic HTML, sufficient color contrast on the purple background, keyboard-navigable form, alt text on all images.
- **SEO / Local SEO:** page title + meta description targeting "pickleball Santa Maria Davao Occidental," schema.org `LocalBusiness`/`SportsActivityLocation` with address, phone, hours, geo, price range.
- **Clickable everything:** `tel:` link on the phone number, direct link to the Facebook page, map link/embed to the address.
- **Flexible & upgradeable architecture** — componentized, clean structure, easy to add pages (tournaments, memberships, shop) and modules later. Keep content/config separated from layout.
- **Compliance-minded:** basic privacy notice for the booking form (what data is collected + how it's used), and cookie/consent handling if any analytics are added.

---

## 8. Assets Needed
- Real logo (if none exists, generate a wordmark using the flyer's script + bold style).
- Hi-res court photos (palms + purple surface) — the flyer image can seed the hero if no others exist.
- Partner logos: JOOLA, Paddletek, Selkirk, Franklin.
- Facebook page URL and any exact GPS coordinates for the map pin.

---

## 9. Deliverables
1. **Claude Design:** hero + full landing-page visual concept in the purple/magenta tropical style above.
2. **Claude Code:** production-ready, responsive front-end implementing the design, with the booking module (Phase 1) wired up and structured for Phase 2 upgrades.
