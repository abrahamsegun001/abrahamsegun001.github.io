// ============================================================
// Abraham Oluwasegun — Portfolio interactivity
// ============================================================

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- mobile nav ---------------- */
const navToggle = document.querySelector(".nav-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
if (navToggle && mobileMenu) {
  navToggle.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
    navToggle.textContent = mobileMenu.classList.contains("open") ? "✕" : "☰";
  });
  mobileMenu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      navToggle.textContent = "☰";
    })
  );
}

/* ---------------- active nav link on scroll ---------------- */
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-links a");
const setActive = () => {
  let current = "";
  sections.forEach((sec) => {
    const top = sec.getBoundingClientRect().top;
    if (top < window.innerHeight * 0.4) current = sec.id;
  });
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
  });
};
document.addEventListener("scroll", setActive, { passive: true });
setActive();

/* ---------------- scroll reveal ---------------- */
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !prefersReducedMotion) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

/* ---------------- copy email toast ---------------- */
const toast = document.querySelector(".toast");
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}
document.querySelectorAll("[data-copy-email]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const email = el.getAttribute("data-copy-email");
    navigator.clipboard?.writeText(email).then(() => showToast("Email copied — " + email));
  });
});

/* ============================================================
   Hero canvas — a small live spiking-network simulation.
   Nodes are neurons; edges are synapses. Activity (a light
   pulse) periodically originates at a random node and
   propagates outward along connections, echoing the widefield
   calcium-imaging dynamics this site's owner studies.
   ============================================================ */
(function heroNetwork() {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let width, height, dpr;
  let nodes = [];
  let edges = [];
  let pulses = [];
  let mouse = { x: -9999, y: -9999 };
  let raf;

  const CYAN = "53, 215, 234";
  const MAGENTA = "208, 102, 240";

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNetwork();
  }

  function buildNetwork() {
    const density = width < 700 ? 0.00009 : 0.00013;
    const count = Math.max(24, Math.min(70, Math.floor(width * height * density)));
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.4 + 1.3,
        glow: 0,
      });
    }
    edges = [];
    const maxDist = width < 700 ? 130 : 165;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < maxDist) edges.push({ a: i, b: j, d });
      }
    }
    // adjacency for pulse propagation
    nodes.forEach((n, i) => (n.adj = edges.filter((e) => e.a === i || e.b === i)));
  }

  function spawnPulse() {
    if (!nodes.length) return;
    const start = Math.floor(Math.random() * nodes.length);
    nodes[start].glow = 1;
    const color = Math.random() < 0.78 ? CYAN : MAGENTA;
    (nodes[start].adj || []).forEach((e) => {
      const other = e.a === start ? e.b : e.a;
      pulses.push({ edge: e, from: start, to: other, t: 0, color });
    });
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    // drift nodes
    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;
      // gentle cursor attraction/glow
      const dx = mouse.x - n.x, dy = mouse.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 140) n.glow = Math.max(n.glow, 1 - dist / 140);
      n.glow *= 0.94;
    });

    // edges
    ctx.lineWidth = 1;
    edges.forEach((e) => {
      const a = nodes[e.a], b = nodes[e.b];
      const alpha = Math.max(0, 0.16 - e.d / 1400);
      ctx.strokeStyle = `rgba(${CYAN}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    // pulses travelling along edges
    pulses.forEach((p) => (p.t += 0.028));
    pulses = pulses.filter((p) => p.t < 1);
    pulses.forEach((p) => {
      const a = nodes[p.from], b = nodes[p.to];
      if (!a || !b) return;
      const x = a.x + (b.x - a.x) * p.t;
      const y = a.y + (b.y - a.y) * p.t;
      ctx.beginPath();
      ctx.arc(x, y, 2.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${1 - p.t})`;
      ctx.shadowColor = `rgba(${p.color}, 0.9)`;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (p.t > 0.94 && nodes[p.to]) nodes[p.to].glow = Math.max(nodes[p.to].glow, 0.8);
    });

    // nodes
    nodes.forEach((n) => {
      const glow = Math.min(1, n.glow);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + glow * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CYAN}, ${0.35 + glow * 0.6})`;
      if (glow > 0.05) {
        ctx.shadowColor = `rgba(${CYAN}, 0.8)`;
        ctx.shadowBlur = 10 * glow;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    raf = requestAnimationFrame(step);
  }

  window.addEventListener("resize", resize);
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  canvas.addEventListener("mouseleave", () => (mouse = { x: -9999, y: -9999 }));

  resize();

  if (prefersReducedMotion) {
    // static single frame, no animation loop, no interval pulses
    step();
    cancelAnimationFrame(raf);
  } else {
    step();
    setInterval(spawnPulse, 850);
  }
})();
