import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "brochures");
const logoPath = path.join(root, "brochures/assets/alvas-education-foundation.png");
const qrPath = path.join(root, "Event.png");
const outputPath = path.join(outDir, "techsiege-2026-college-brochure.pdf");

const W = 595.28;
const H = 841.89;
const m = 42;
const C = {
  navy: hex("07142e"),
  blue: hex("063d7a"),
  cyan: hex("25c7e8"),
  aqua: hex("42e8c7"),
  orange: hex("ff8a5b"),
  lime: hex("d7ef61"),
  purple: hex("b89cff"),
  pink: hex("ff6fae"),
  ink: hex("0c1a33"),
  slate: hex("52627e"),
  mist: hex("e8f0fb"),
  white: rgb(1, 1, 1),
  paper: hex("f8fbff"),
  line: hex("cad9ee"),
};

function hex(value) {
  const clean = value.replace("#", "");
  return rgb(parseInt(clean.slice(0, 2), 16) / 255, parseInt(clean.slice(2, 4), 16) / 255, parseInt(clean.slice(4, 6), 16) / 255);
}

function text(page, value, x, y, size, font, color = C.ink, options = {}) {
  page.drawText(value, { x, y, size, font, color, ...options });
}

function wrap(font, value, size, width) {
  const words = value.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function paragraph(page, value, x, y, width, size, font, color = C.slate, leading = size * 1.42) {
  const lines = wrap(font, value, size, width);
  lines.forEach((line, index) => text(page, line, x, y - index * leading, size, font, color));
  return y - lines.length * leading;
}

function rule(page, y, color = C.line, x1 = m, x2 = W - m) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.8, color });
}

function pageBase(pdf, index, logo, fonts, title) {
  const page = pdf.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.paper });
  page.drawRectangle({ x: 0, y: H - 9, width: W, height: 9, color: C.navy });
  page.drawRectangle({ x: 0, y: 0, width: W, height: 5, color: C.cyan });
  page.drawImage(logo, { x: m, y: H - 69, width: 31, height: 31 });
  text(page, "ALVA'S INSTITUTE OF ENGINEERING AND TECHNOLOGY", m + 40, H - 46, 7.6, fonts.bold, C.blue, { characterSpacing: 0.5 });
  text(page, "MIJAR", m + 40, H - 58, 6.4, fonts.regular, C.slate, { characterSpacing: 1.5 });
  text(page, title.toUpperCase(), W - m - fonts.bold.widthOfTextAtSize(title.toUpperCase(), 7.2), H - 50, 7.2, fonts.bold, C.slate, { characterSpacing: 1.1 });
  rule(page, H - 82);
  text(page, `TECHSIEGE 2026  /  ${String(index).padStart(2, "0")}`, m, 25, 7.1, fonts.bold, C.slate, { characterSpacing: 1.1 });
  text(page, "CSE (IoT, Cybersecurity and Blockchain Technology)", W - m - fonts.regular.widthOfTextAtSize("CSE (IoT, Cybersecurity and Blockchain Technology)", 7), 25, 7, fonts.regular, C.slate);
  return page;
}

function pill(page, label, x, y, fill, fonts) {
  const size = 7;
  const padding = 8;
  const width = fonts.bold.widthOfTextAtSize(label, size) + padding * 2;
  page.drawRectangle({ x, y, width, height: 18, color: fill });
  text(page, label, x + padding, y + 6, size, fonts.bold, C.navy, { characterSpacing: 0.4 });
  return width;
}

function eventCard(page, event, x, y, width, height, fonts) {
  page.drawRectangle({ x, y, width, height, color: C.white, borderColor: C.line, borderWidth: 0.8 });
  page.drawRectangle({ x, y: y + height - 6, width, height: 6, color: event.accent });
  text(page, event.number, x + 16, y + height - 30, 8, fonts.bold, event.accent, { characterSpacing: 1.2 });
  text(page, event.category.toUpperCase(), x + 47, y + height - 30, 7, fonts.bold, C.slate, { characterSpacing: 1 });
  text(page, event.name, x + 16, y + height - 59, 16, fonts.bold, C.ink);
  const after = paragraph(page, event.description, x + 16, y + height - 77, width - 32, 8.6, fonts.regular, C.slate, 11.5);
  rule(page, y + 34, C.line, x + 16, x + width - 16);
  text(page, `${event.date}  |  ${event.team}`, x + 16, y + 20, 7.3, fonts.bold, C.ink);
  text(page, `${event.fee}  |  ${event.prize}`, x + 16, y + 9, 7.3, fonts.regular, C.slate);
  return after;
}

async function build() {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Techsiege 2026 - Inter-College Brochure");
  pdf.setAuthor("Department of CSE (IoT, Cybersecurity and Blockchain Technology), AIET");
  pdf.setSubject("Techsiege 2026 inter-college competition festival");
  pdf.setKeywords(["Techsiege", "AIET", "Hackathon", "CTF", "Inter-college fest"]);

  const [regular, bold, logoBytes, qrBytes] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    fs.readFile(logoPath),
    fs.readFile(qrPath),
  ]);
  const fonts = { regular, bold };
  const logo = await pdf.embedPng(logoBytes);
  const qr = await pdf.embedPng(qrBytes);

  // Cover
  const cover = pdf.addPage([W, H]);
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.navy });
  cover.drawRectangle({ x: 0, y: 0, width: W, height: 12, color: C.cyan });
  cover.drawRectangle({ x: 0, y: H - 12, width: W, height: 12, color: C.orange });
  for (let i = 0; i < 11; i++) {
    const x = 45 + i * 54;
    cover.drawLine({ start: { x, y: 105 }, end: { x: x + 86, y: 190 }, thickness: 0.65, color: C.blue, opacity: 0.55 });
    cover.drawCircle({ x: x + 86, y: 190, size: 2.2, color: C.cyan, opacity: 0.75 });
  }
  cover.drawRectangle({ x: m, y: H - 130, width: 73, height: 73, color: C.white });
  cover.drawImage(logo, { x: m + 8, y: H - 122, width: 57, height: 57 });
  text(cover, "ALVA'S INSTITUTE OF", 130, H - 78, 9, bold, C.white, { characterSpacing: 1.1 });
  text(cover, "ENGINEERING AND TECHNOLOGY, MIJAR", 130, H - 94, 9, bold, C.white, { characterSpacing: 0.55 });
  text(cover, "Department of CSE (IoT, Cybersecurity and Blockchain Technology)", 130, H - 111, 7.3, regular, C.mist);
  text(cover, "PRESENTS", m, H - 199, 8, bold, C.cyan, { characterSpacing: 3 });
  text(cover, "TECHSIEGE", m, H - 290, 57, bold, C.white, { characterSpacing: -1.5 });
  text(cover, "2026", m, H - 360, 57, bold, C.cyan, { characterSpacing: -1.5 });
  text(cover, "INTER-COLLEGE TECHNOLOGY COMPETITION FESTIVAL", m, H - 392, 10, bold, C.lime, { characterSpacing: 1.25 });
  paragraph(cover, "Five arenas for builders, defenders, engineers, solvers and competitors ready to show up.", m, H - 442, 365, 16, regular, C.mist, 23);
  rule(cover, 315, C.blue, m, W - m);
  text(cover, "4 & 5 DECEMBER 2026", m, 278, 17, bold, C.white);
  text(cover, "AIET, MIJAR  |  OPEN TO STUDENTS FROM ALL COLLEGES", m, 253, 9, bold, C.cyan, { characterSpacing: 0.6 });
  const p1 = pill(cover, "Rs 85,000 TOTAL PRIZE POOL", m, 193, C.lime, fonts);
  pill(cover, "REGISTRATIONS OPEN", m + p1 + 10, 193, C.orange, fonts);
  const accents = [C.aqua, C.orange, C.lime, C.purple, C.pink];
  accents.forEach((color, index) => cover.drawRectangle({ x: m + index * 95, y: 145, width: 82, height: 5, color }));
  text(cover, "HACKATHON  /  CTF  /  CIRCUIT BREAKER  /  CRACK THE CODE  /  E-SPORTS", m, 121, 7.7, bold, C.white, { characterSpacing: 0.2 });
  text(cover, "IDEAS. CODE. IMPACT.", m, 77, 11, bold, C.mist, { characterSpacing: 2.4 });

  // Event overview
  const page2 = pageBase(pdf, 2, logo, fonts, "The arenas");
  text(page2, "FIVE WAYS TO", m, H - 130, 12, bold, C.blue, { characterSpacing: 1.8 });
  text(page2, "SHOW UP.", m, H - 178, 35, bold, C.ink);
  paragraph(page2, "Every arena is on campus at AIET, Mijar. Teams from other colleges are welcome to enter.", m, H - 204, 410, 10.5, regular, C.slate, 15);
  const events = [
    { number: "01", category: "Build", name: "Hackathon", description: "A 24-hour build arena for teams turning a sharp idea into a working experience.", date: "4-5 Dec", team: "2-4 members", fee: "Rs 600 / team", prize: "Rs 40,000 prize pool", accent: C.aqua },
    { number: "02", category: "Defend", name: "CTF", description: "Jeopardy-style capture-the-flag challenges across web, SOC, crypto, networking, forensics and more.", date: "5 Dec", team: "2-4 members", fee: "Rs 500 / team", prize: "Rs 25,000 prize pool", accent: C.orange },
    { number: "03", category: "Engineer", name: "Circuit Breaker", description: "A hands-on circuit challenge for teams who think fast, wire smart and make it work.", date: "5 Dec", team: "2 members", fee: "Rs 200 / team", prize: "Rs 6,000 prize pool", accent: C.lime },
    { number: "04", category: "Solve", name: "Crack the Code", description: "A timed problem-solving face-off built for teams that enjoy difficult questions under pressure.", date: "5 Dec", team: "2 members", fee: "Rs 200 / team", prize: "Rs 6,000 prize pool", accent: C.purple },
    { number: "05", category: "Compete", name: "E-sports", description: "A live competitive bracket for focus, teamwork and memorable finishes.", date: "5 Dec", team: "2-4 members", fee: "Rs 200 / team", prize: "Rs 5,000 prize pool", accent: C.pink },
  ];
  eventCard(page2, events[0], m, 480, 247, 155, fonts);
  eventCard(page2, events[1], m + 263, 480, 247, 155, fonts);
  eventCard(page2, events[2], m, 303, 247, 155, fonts);
  eventCard(page2, events[3], m + 263, 303, 247, 155, fonts);
  eventCard(page2, events[4], m + 132, 126, 247, 155, fonts);

  // Schedule and participation
  const page3 = pageBase(pdf, 3, logo, fonts, "Plan your entry");
  text(page3, "TWO DAYS.", m, H - 135, 34, bold, C.ink);
  text(page3, "FIVE ARENAS.", m, H - 176, 34, bold, C.blue);
  text(page3, "DAY 01", m, H - 228, 8, bold, C.orange, { characterSpacing: 1.7 });
  text(page3, "4 DECEMBER", m, H - 252, 17, bold, C.ink);
  text(page3, "11:00 AM", m, H - 276, 10, bold, C.blue);
  paragraph(page3, "Hackathon launch. Teams begin the 24-hour build challenge after the problem statement is revealed.", m, H - 296, 230, 9, regular, C.slate, 13);
  page3.drawRectangle({ x: 312, y: 510, width: 241, height: 165, color: C.navy });
  text(page3, "DAY 02", 332, 640, 8, bold, C.lime, { characterSpacing: 1.7 });
  text(page3, "5 DECEMBER", 332, 615, 17, bold, C.white);
  text(page3, "10:30 AM", 332, 591, 10, bold, C.cyan);
  ["CTF", "Circuit Breaker", "Crack the Code", "E-sports"].forEach((item, index) => {
    page3.drawCircle({ x: 338, y: 561 - index * 20, size: 3.5, color: [C.orange, C.lime, C.purple, C.pink][index] });
    text(page3, item, 350, 557 - index * 20, 9.2, regular, C.mist);
  });
  rule(page3, 470);
  text(page3, "PARTICIPATION AT A GLANCE", m, 438, 9, bold, C.blue, { characterSpacing: 1.4 });
  const highlights = [
    ["WHO CAN PARTICIPATE", "Students from all colleges and all branches"],
    ["FORMAT", "Team-based, on-campus competition arenas"],
    ["TEAM SIZE", "2 members or 2-4 members, depending on arena"],
    ["REGISTRATION STATUS", "Registrations open"],
  ];
  highlights.forEach(([label, value], index) => {
    const y = 392 - index * 62;
    page3.drawRectangle({ x: m, y: y - 14, width: 511, height: 47, color: index % 2 ? C.white : C.mist });
    text(page3, label, m + 14, y + 12, 7.3, bold, C.blue, { characterSpacing: 0.7 });
    text(page3, value, m + 14, y - 3, 10, regular, C.ink);
  });
  page3.drawRectangle({ x: m, y: 102, width: 511, height: 88, color: C.blue });
  text(page3, "COME WITH A TEAM. LEAVE WITH A STORY.", m + 19, 157, 15, bold, C.white);
  paragraph(page3, "Bring your college ID, laptop, charger and everything your team needs to work without interruption. Refreshments and participant certificates will be provided.", m + 19, 133, 454, 8.8, regular, C.mist, 12);

  // Registration
  const page4 = pageBase(pdf, 4, logo, fonts, "Register");
  text(page4, "READY TO", m, H - 136, 13, bold, C.blue, { characterSpacing: 1.6 });
  text(page4, "ENTER?", m, H - 184, 38, bold, C.ink);
  paragraph(page4, "Registration is completed online, one team at a time. Select an arena, add your team details, complete the entry-fee payment step and upload the receipt for verification.", m, H - 212, 336, 10.4, regular, C.slate, 15);
  const steps = [
    ["01", "Choose your arena", "Read the event brief, team size and fee before starting."],
    ["02", "Register your team", "Add the team leader and members in the online form."],
    ["03", "Complete payment", "Pay by UPI, provide the transaction ID and upload the payment receipt."],
  ];
  steps.forEach(([n, heading, desc], index) => {
    const y = 498 - index * 90;
    page4.drawCircle({ x: m + 15, y: y + 20, size: 15, color: [C.aqua, C.orange, C.lime][index] });
    text(page4, n, m + 8.5, y + 17.5, 7.5, bold, C.navy);
    text(page4, heading, m + 45, y + 28, 12, bold, C.ink);
    paragraph(page4, desc, m + 45, y + 10, 278, 8.7, regular, C.slate, 11.5);
  });
  page4.drawRectangle({ x: 395, y: 320, width: 140, height: 140, color: C.white, borderColor: C.line, borderWidth: 1 });
  page4.drawImage(qr, { x: 404, y: 329, width: 122, height: 122 });
  text(page4, "SCAN TO REGISTER", 392, 300, 8, bold, C.blue, { characterSpacing: 1 });
  rule(page4, 255);
  text(page4, "GET IN TOUCH", m, 223, 9, bold, C.blue, { characterSpacing: 1.5 });
  text(page4, "Email", m, 188, 8, bold, C.slate);
  text(page4, "cynex.depticb@gmail.com", m, 171, 11, bold, C.ink);
  text(page4, "WhatsApp", 260, 188, 8, bold, C.slate);
  text(page4, "+91 73490 97923", 260, 171, 11, bold, C.ink);
  text(page4, "Venue", m, 132, 8, bold, C.slate);
  text(page4, "Alva's Institute of Engineering and Technology, Mijar, Moodbidri", m, 115, 10, regular, C.ink);
  text(page4, "techsiege.cynexicb.com", m, 76, 14, bold, C.blue);
  text(page4, "TECHSIEGE 2026  |  YOUR SKILLS. YOUR ARENA. YOUR MOVE.", m, 52, 7.4, bold, C.slate, { characterSpacing: 0.65 });

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outputPath, await pdf.save());
  console.log(outputPath);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
