// ============ CONFIG ============
const GROQ_KEY =
  "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";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

async function groq(messages, max = 600) {
  const r = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + GROQ_KEY,
    },
    body: JSON.stringify({ model: MODEL, max_tokens: max, messages }),
  });
  const d = await r.json();
  return d.choices[0].message.content;
}

// ============ MARQUEE ============
const logos = [
  { name: "TechFlow", icon: "🚀", url: "#" },
  { name: "NovaBuild", icon: "🏗️", url: "#" },
  { name: "GreenMed", icon: "🌿", url: "#" },
  { name: "UrbanFit", icon: "💪", url: "#" },
  { name: "LuxDecor", icon: "✨", url: "#" },
  { name: "SwiftCargo", icon: "📦", url: "#" },
  { name: "PrimeLaw", icon: "⚖️", url: "#" },
  { name: "ArtStudio", icon: "🎨", url: "#" },
];
function buildMarquee() {
  const t = document.getElementById("marqueeTrack");
  const all = [...logos, ...logos];
  t.innerHTML = all
    .map(
      (l) => `
<div class="marquee-item" onclick="window.open('${l.url}','_blank')">
<div class="marquee-logo">
  <div class="marquee-logo-icon">${l.icon}</div>
  <div class="marquee-logo-name">${l.name}</div>
</div>
</div>`,
    )
    .join("");
}
buildMarquee();

// ============ GSAP ANIMATIONS ============
gsap.registerPlugin(ScrollTrigger);

// Try SplitText — graceful fallback if not loaded
function trySplit(el) {
  try {
    return new SplitText(el, { type: "chars,words" });
  } catch (e) {
    return null;
  }
}

// NAV
gsap.to("#logo", { opacity: 1, duration: 0.6, delay: 0.2 });
gsap.to("#navCta", { opacity: 1, duration: 0.6, delay: 0.4 });

// HERO sequence
gsap.to("#heroGlow", { opacity: 1, duration: 1.5, delay: 0.1 });
gsap.to("#badge", { opacity: 1, y: 0, duration: 0.7, delay: 0.3 });

// Hero title — split or fallback
window.addEventListener("load", () => {
  const st = trySplit("#heroTitle");
  if (st) {
    gsap.from(st.chars, {
      opacity: 0,
      y: 40,
      stagger: 0.018,
      duration: 0.6,
      delay: 0.5,
      ease: "power3.out",
    });
  } else {
    gsap.to("#heroTitle .tl", {
      opacity: 1,
      y: 0,
      stagger: 0.15,
      duration: 0.8,
      delay: 0.5,
      ease: "power3.out",
    });
    document
      .querySelectorAll("#heroTitle .tl")
      .forEach((el) => (el.style.opacity = "0"));
  }
});

gsap.to("#heroSub", {
  opacity: 1,
  duration: 0.8,
  delay: 1,
  ease: "power2.out",
});
gsap.to("#heroBtns", { opacity: 1, duration: 0.7, delay: 1.2 });
gsap.to("#scrollLine", { opacity: 1, duration: 0.6, delay: 1.6 });
gsap.to("#scrollLine .scroll-line-bar", {
  scaleY: 0,
  transformOrigin: "top",
  duration: 1,
  delay: 1.8,
  repeat: -1,
  yoyo: true,
  ease: "sine.inOut",
});

// STATS bar
gsap.from("#statsBar .stat", {
  opacity: 0,
  y: 30,
  stagger: 0.12,
  duration: 0.6,
  scrollTrigger: { trigger: "#statsBar", start: "top 85%" },
});

// Counter animation
ScrollTrigger.create({
  trigger: "#statsBar",
  start: "top 80%",
  once: true,
  onEnter() {
    document.querySelectorAll(".stat-num").forEach((el) => {
      const t = +el.dataset.target,
        suf = el.dataset.suffix;
      let c = 0;
      const step = Math.ceil(t / 55);
      const tm = setInterval(() => {
        c = Math.min(c + step, t);
        el.textContent = c + suf;
        if (c >= t) clearInterval(tm);
      }, 22);
    });
  },
});

// Section titles split on scroll
document.querySelectorAll(".split-title").forEach((el) => {
  const st = trySplit(el);
  if (st) {
    gsap.from(st.chars, {
      opacity: 0,
      y: 30,
      stagger: 0.02,
      duration: 0.5,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  }
});

// Service cards
gsap.utils.toArray(".service-card").forEach((card, i) => {
  gsap.to(card, {
    opacity: 1,
    y: 0,
    duration: 0.65,
    ease: "power2.out",
    scrollTrigger: { trigger: card, start: "top 88%", once: true },
    delay: (i % 3) * 0.1,
  });
});

// Process steps
gsap.utils.toArray(".process-step").forEach((step, i) => {
  gsap.to(step, {
    opacity: 1,
    y: 0,
    duration: 0.6,
    ease: "power2.out",
    scrollTrigger: { trigger: step, start: "top 88%", once: true },
    delay: i * 0.12,
  });
});

// Num blocks
gsap.utils.toArray(".num-block").forEach((b, i) => {
  gsap.to(b, {
    opacity: 1,
    duration: 0.6,
    y: 0,
    ease: "power2.out",
    scrollTrigger: { trigger: b, start: "top 88%", once: true },
    delay: i * 0.1,
  });
  gsap.from(b, {
    y: 20,
    scrollTrigger: { trigger: b, start: "top 88%", once: true },
    delay: i * 0.1,
    duration: 0.6,
  });
});

// Review cards
gsap.utils.toArray(".review-card").forEach((card, i) => {
  gsap.to(card, {
    opacity: 1,
    y: 0,
    duration: 0.65,
    ease: "power2.out",
    scrollTrigger: { trigger: card, start: "top 88%", once: true },
    delay: i * 0.12,
  });
});

// FAQ items
gsap.utils.toArray(".faq-item").forEach((item, i) => {
  gsap.to(item, {
    opacity: 1,
    x: 0,
    duration: 0.55,
    ease: "power2.out",
    scrollTrigger: { trigger: item, start: "top 90%", once: true },
    delay: i * 0.07,
  });
});

// CTA title
ScrollTrigger.create({
  trigger: "#ctaTitle",
  start: "top 85%",
  once: true,
  onEnter() {
    const st = trySplit("#ctaTitle");
    if (st)
      gsap.from(st.chars, {
        opacity: 0,
        y: 25,
        stagger: 0.025,
        duration: 0.5,
        ease: "power2.out",
      });
  },
});

// Parallax glow
gsap.to("#heroGlow", {
  y: -80,
  ease: "none",
  scrollTrigger: {
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: true,
  },
});

// NAV scroll
window.addEventListener("scroll", () => {
  document.getElementById("nav").style.borderBottomColor =
    window.scrollY > 50
      ? "rgba(192,192,192,.14)"
      : "rgba(192,192,192,.04)";
});

// ============ FAQ ============
document.querySelectorAll(".faq-q").forEach((q) => {
  q.addEventListener("click", () => {
    const item = q.parentElement,
      isOpen = item.classList.contains("open");
    document
      .querySelectorAll(".faq-item")
      .forEach((i) => i.classList.remove("open"));
    if (!isOpen) item.classList.add("open");
  });
});

// ============ MODAL ============
function openModal() {
  document.getElementById("quoteModal").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  document.getElementById("quoteModal").classList.remove("open");
  document.body.style.overflow = "";
}
function closeModalOutside(e) {
  if (e.target === document.getElementById("quoteModal")) closeModal();
}

async function submitQuote() {
  const name = document.getElementById("f-name").value.trim();
  const email = document.getElementById("f-email").value.trim();
  const type = document.getElementById("f-type").value;
  const industry = document.getElementById("f-industry").value.trim();
  const features = document.getElementById("f-features").value;
  const desc = document.getElementById("f-desc").value.trim();
  if (!name || !email || !type || !industry) {
    alert("Proszę wypełnić wymagane pola.");
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Analizuję...";
  document.getElementById("aiThinking").classList.add("show");
  document.getElementById("quoteResult").classList.remove("show");

  const prompt = `Jesteś asystentem agencji webowej WebCraft z Polski. Klient złożył zapytanie:
- Rodzaj strony: ${type}
- Branża: ${industry}
- Pakiet funkcji: ${features}
- Opis: ${desc || "brak"}

Odpowiedz TYLKO JSON bez markdown:
{"cena_min":number,"cena_max":number,"czas_realizacji":"X-Y dni","pozycje":[{"nazwa":"...","cena":"X–Y zł"}],"uwagi":"2 zdania po polsku dla klienta"}

Widełki cenowe: landing 800-1800 zł, firmowa 1500-3500 zł, sklep 3000-7000 zł, redesign 1000-3000 zł, aplikacja 5000-15000 zł.`;

  try {
    const raw = await groq([{ role: "user", content: prompt }]);
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    document.getElementById("quotePrice").textContent =
      `${json.cena_min.toLocaleString("pl-PL")} – ${json.cena_max.toLocaleString("pl-PL")} zł`;
    document.getElementById("quoteNote").textContent =
      `⏱ ${json.czas_realizacji} • ${json.uwagi}`;
    let bd = "";
    (json.pozycje || []).forEach((p) => {
      bd += `<div class="quote-item"><span>${p.nazwa}</span><span>${p.cena}</span></div>`;
    });
    document.getElementById("quoteBreakdown").innerHTML = bd;
    document.getElementById("quoteResult").classList.add("show");
  } catch (e) {
    const fb = {
      landing: { min: 800, max: 1800, czas: "3–5 dni" },
      firmowa: { min: 1500, max: 3500, czas: "7–14 dni" },
      sklep: { min: 3000, max: 7000, czas: "14–28 dni" },
      redesign: { min: 1000, max: 3000, czas: "5–10 dni" },
      aplikacja: { min: 5000, max: 15000, czas: "30–60 dni" },
    };
    const f = fb[type] || fb.firmowa;
    document.getElementById("quotePrice").textContent =
      `${f.min.toLocaleString("pl-PL")} – ${f.max.toLocaleString("pl-PL")} zł`;
    document.getElementById("quoteNote").textContent =
      `⏱ Czas realizacji: ${f.czas} • Skontaktuję się z Tobą w ciągu 24h z finalną ofertą.`;
    document.getElementById("quoteBreakdown").innerHTML = "";
    document.getElementById("quoteResult").classList.add("show");
  }

  document.getElementById("aiThinking").classList.remove("show");
  btn.disabled = false;
  btn.textContent = "Wyślij zapytanie →";
  btn.onclick = finalSubmit;
}

function finalSubmit() {
  document.getElementById("formStep").style.display = "none";
  document.getElementById("successStep").style.display = "block";
}

// ============ CHAT ============
let chatOpen = false,
  chatHistory = [];
const SYS = `Jesteś przyjaznym asystentem agencji webowej WebCraft. Odpowiadasz po polsku, krótko (max 3-4 zdania). Ceny: landing 800-1800 zł, firmowa 1500-3500 zł, sklep 3000-7000 zł. Czas: landing 3-5 dni, firmowa 7-14 dni, sklep 14-28 dni. Jeśli ktoś pyta o wycenę — zachęć do formularza.`;

function toggleChat() {
  chatOpen = !chatOpen;
  document
    .getElementById("chatWindow")
    .classList.toggle("open", chatOpen);
  const badge = document
    .getElementById("chatToggle")
    .querySelector(".chat-badge");
  if (badge) badge.style.display = "none";
  document.getElementById("chatToggle").innerHTML = chatOpen
    ? "✕"
    : '💬<div class="chat-badge" style="display:none">1</div>';
  if (chatOpen && !document.getElementById("chatMsgs").children.length) {
    setTimeout(
      () =>
        addBot(
          "Cześć! 👋 Jestem asystentem WebCraft. Chętnie odpowiem na pytania o strony internetowe lub pomogę oszacować koszt projektu. W czym mogę pomóc?",
        ),
      300,
    );
  }
}

function addBot(t) {
  const m = document.getElementById("chatMsgs");
  const d = document.createElement("div");
  d.className = "msg bot";
  d.textContent = t;
  m.appendChild(d);
  m.scrollTop = m.scrollHeight;
}
function addUser(t) {
  const m = document.getElementById("chatMsgs");
  const d = document.createElement("div");
  d.className = "msg user";
  d.textContent = t;
  m.appendChild(d);
  m.scrollTop = m.scrollHeight;
  document.getElementById("chatSug").style.display = "none";
}
function addTyping() {
  const m = document.getElementById("chatMsgs");
  const d = document.createElement("div");
  d.className = "msg bot msg-typing";
  d.id = "typing";
  d.innerHTML =
    '<div class="dot-anim"><span></span><span></span><span></span></div>';
  m.appendChild(d);
  m.scrollTop = m.scrollHeight;
}
function removeTyping() {
  const t = document.getElementById("typing");
  if (t) t.remove();
}

function sendSug(t) {
  document.getElementById("chatInput").value = t;
  sendMsg();
}

async function sendMsg() {
  const inp = document.getElementById("chatInput");
  const t = inp.value.trim();
  if (!t) return;
  inp.value = "";
  addUser(t);
  chatHistory.push({ role: "user", content: t });
  addTyping();
  try {
    const msgs = [{ role: "system", content: SYS }, ...chatHistory];
    const reply = await groq(msgs, 300);
    removeTyping();
    addBot(reply);
    chatHistory.push({ role: "assistant", content: reply });
    if (chatHistory.length > 14) chatHistory = chatHistory.slice(-14);
  } catch (e) {
    removeTyping();
    addBot(
      "Przepraszam, wystąpił problem z połączeniem. Spróbuj ponownie! 📩",
    );
  }
}
