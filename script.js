function navigateToSection(hash, updateHistory = true) {
  const target = document.querySelector(hash);
  if (!target) return;

  const section = target.matches("main > section") ? target : target.closest("main > section");
  if (!section) return;

  document.body.dataset.view = section.id;
  setBirthdayRevealActive(section.id === "birthday-reveal");
  if (updateHistory && window.location.hash !== hash) {
    window.history.pushState(null, "", hash);
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

const revealCanvas = document.querySelector("#love-rain");
const revealMessage = document.querySelector("#birthday-reveal-title");
const revealReplay = document.querySelector("#reveal-replay");
const revealContext = revealCanvas?.getContext("2d");
const revealPhases = ["3", "2", "1", "HAPPY", "BIRTHDAY", "TO YOU", "♡"];
const revealPhaseDurations = [900, 900, 900, 1050, 1100, 1000, 3600];
let revealStreams = [];
let revealHeartParticles = [];
let revealAnimationFrame;
let revealStartedAt = 0;
let revealHeartStartedAt = 0;
let revealCurrentPhase;
let revealActive = false;

function resizeLoveRain() {
  if (!revealCanvas || !revealContext) return;

  const bounds = revealCanvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  revealCanvas.width = Math.round(bounds.width * pixelRatio);
  revealCanvas.height = Math.round(bounds.height * pixelRatio);
  revealContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const dropCount = Math.max(14, Math.ceil(bounds.width / 42));
  revealStreams = Array.from({ length: dropCount }, () => ({
    x: Math.random() * bounds.width,
    y: -Math.random() * bounds.height,
    speed: 0.8 + Math.random() * 2.2,
    alpha: 0.2 + Math.random() * 0.55,
    fontSize: 8 + Math.random() * 5,
  }));
}

function createHeartParticles() {
  if (!revealCanvas) return;

  const width = revealCanvas.clientWidth;
  const height = revealCanvas.clientHeight;
  const scale = Math.min(9, width / 44);
  const centerX = width / 2;
  const centerY = height / 2;

  revealHeartParticles = Array.from({ length: 130 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const fill = Math.sqrt(Math.random());
    const heartX = 16 * Math.sin(angle) ** 3;
    const heartY = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
    const edge = Math.floor(Math.random() * 4);
    const startX = edge < 2 ? Math.random() * width : (edge === 2 ? -20 : width + 20);
    const startY = edge >= 2 ? Math.random() * height : (edge === 0 ? -20 : height + 20);

    return {
      startX,
      startY,
      targetX: centerX + heartX * scale * fill,
      targetY: centerY - heartY * scale * fill,
      delay: Math.random() * 650,
      size: 10 + Math.random() * 11,
      wobble: Math.random() * Math.PI * 2,
    };
  });
}

function paintLoveRain(fade = 0) {
  if (!revealCanvas || !revealContext) return;

  const bounds = revealCanvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  if (
    revealCanvas.width !== Math.round(bounds.width * pixelRatio)
    || revealCanvas.height !== Math.round(bounds.height * pixelRatio)
  ) {
    resizeLoveRain();
  }

  const width = revealCanvas.clientWidth;
  const height = revealCanvas.clientHeight;
  revealContext.fillStyle = "rgba(8, 7, 9, 0.2)";
  revealContext.fillRect(0, 0, width, height);
  revealContext.textAlign = "center";

  for (const stream of revealStreams) {
    revealContext.font = `700 ${stream.fontSize}px "DM Sans", sans-serif`;
    revealContext.fillStyle = `rgba(255, 166, 147, ${stream.alpha * (1 - fade)})`;
    revealContext.fillText("I LOVE YOU", stream.x, stream.y);
    stream.y += stream.speed;
    if (stream.y > height + 20) {
      stream.y = -10 - Math.random() * height * 0.4;
      stream.x = Math.random() * width;
      stream.speed = 0.8 + Math.random() * 2.2;
      stream.alpha = 0.2 + Math.random() * 0.55;
    }
  }
}

function paintHeart(elapsed) {
  if (!revealContext) return;

  for (const particle of revealHeartParticles) {
    const progress = Math.max(0, Math.min(1, (elapsed - particle.delay) / 1750));
    const eased = 1 - (1 - progress) ** 3;
    const wobble = (1 - eased) * Math.sin(elapsed / 110 + particle.wobble) * 18;
    const x = particle.startX + (particle.targetX - particle.startX) * eased + wobble;
    const y = particle.startY + (particle.targetY - particle.startY) * eased;
    revealContext.globalAlpha = progress === 0 ? 0.25 : 0.55 + progress * 0.4;
    revealContext.font = `${particle.size}px "DM Sans", sans-serif`;
    revealContext.textAlign = "center";
    revealContext.fillStyle = "#ff8f86";
    revealContext.fillText("♥", x, y);
  }
  revealContext.globalAlpha = 1;

  if (elapsed >= 1750 && revealCanvas) {
    revealContext.font = `900 ${Math.min(34, revealCanvas.clientWidth * 0.075)}px "Nunito", sans-serif`;
    revealContext.textAlign = "center";
    revealContext.textBaseline = "middle";
    revealContext.fillStyle = "#fff3ec";
    revealContext.shadowColor = "rgba(120, 24, 45, 0.9)";
    revealContext.shadowBlur = 8;
    revealContext.fillText("I LOVE YOU", revealCanvas.clientWidth / 2, revealCanvas.clientHeight / 2);
    revealContext.shadowBlur = 0;
  }
}

function getRevealPhase(elapsed) {
  let phaseStart = 0;
  for (let index = 0; index < revealPhaseDurations.length; index += 1) {
    if (elapsed < phaseStart + revealPhaseDurations[index]) {
      return { index, start: phaseStart };
    }
    phaseStart += revealPhaseDurations[index];
  }

  return {
    index: revealPhases.length - 1,
    start: phaseStart - revealPhaseDurations[revealPhaseDurations.length - 1],
  };
}

function updateBirthdayReveal(timestamp) {
  if (!revealActive) return;

  const elapsed = timestamp - revealStartedAt;
  const { index: phaseIndex, start: phaseStart } = getRevealPhase(elapsed);
  const phase = revealPhases[phaseIndex];
  if (phase === "♡" && revealCurrentPhase !== phase) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    revealHeartStartedAt = timestamp - (reducedMotion ? 1750 : 0);
    createHeartParticles();
  }
  revealCurrentPhase = phase;
  if (revealMessage && revealMessage.textContent !== phase) {
    revealMessage.textContent = phase === "♡" ? "I LOVE YOU" : phase;
    revealMessage.classList.toggle("is-long", phase.length > 3 || phase === "♡");
    revealMessage.classList.toggle("is-heart", phase === "♡");
  }

  const heartElapsed = timestamp - revealHeartStartedAt;
  const heartProgress = phase === "♡" ? Math.min(1, heartElapsed / 1750) : 0;
  paintLoveRain(heartProgress);
  if (phase === "♡") paintHeart(heartElapsed);
  if (phaseIndex === revealPhases.length - 1 && elapsed - phaseStart >= revealPhaseDurations[phaseIndex]) {
    revealActive = false;
    revealAnimationFrame = undefined;
    return;
  }
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealAnimationFrame = window.requestAnimationFrame(updateBirthdayReveal);
  }
}

function setBirthdayRevealActive(isActive, replay = false) {
  if (!revealCanvas || !revealMessage) return;

  if (!isActive) {
    revealActive = false;
    if (revealAnimationFrame) window.cancelAnimationFrame(revealAnimationFrame);
    revealAnimationFrame = undefined;
    return;
  }

  if (revealActive && !replay) return;
  revealActive = true;
  revealStartedAt = window.performance.now();
  revealCurrentPhase = undefined;
  revealHeartParticles = [];
  resizeLoveRain();
  if (revealAnimationFrame) window.cancelAnimationFrame(revealAnimationFrame);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const totalDuration = revealPhaseDurations.reduce((total, duration) => total + duration, 0);
    revealStartedAt -= totalDuration;
    updateBirthdayReveal(window.performance.now());
    return;
  }

  updateBirthdayReveal(revealStartedAt);
}

window.addEventListener("resize", () => {
  if (document.body.dataset.view !== "birthday-reveal") return;

  resizeLoveRain();
  if (revealCurrentPhase !== "♡") return;

  createHeartParticles();
  if (!revealActive || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const elapsed = Math.max(0, window.performance.now() - revealHeartStartedAt);
    paintLoveRain(Math.min(1, elapsed / 1750));
    paintHeart(elapsed);
  }
});

revealReplay?.addEventListener("click", () => setBirthdayRevealActive(true, true));

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const hash = link.getAttribute("href");
  if (!hash || !document.querySelector(hash)) return;

  event.preventDefault();
  navigateToSection(hash);
});

window.addEventListener("popstate", () => {
  navigateToSection(window.location.hash || "#home", false);
});

if (window.location.hash) {
  requestAnimationFrame(() => navigateToSection(window.location.hash, false));
}

const countdown = document.querySelector("#countdown");
const birthday = countdown?.dataset.birthday;
const dateParts = birthday?.match(/^(\d{4})-(\d{2})-(\d{2})$/);

function nextBirthday(now) {
  if (!dateParts) return null;

  const month = Number(dateParts[2]) - 1;
  const day = Number(dateParts[3]);
  const thisYearDate = new Date(now.getFullYear(), month, day);
  if (thisYearDate.getMonth() !== month || thisYearDate.getDate() !== day) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return thisYearDate < today ? new Date(now.getFullYear() + 1, month, day) : thisYearDate;
}

function updateCountdown() {
  if (!countdown) return;

  const target = nextBirthday(new Date());
  if (!target) {
    countdown.setAttribute("aria-label", "Төрсөн өдрийн огноо тохируулагдаагүй байна.");
    return;
  }

  const remaining = Math.max(0, target.getTime() - Date.now());
  const units = {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1_000) % 60),
  };

  for (const [unit, value] of Object.entries(units)) {
    const element = document.querySelector(`#${unit}`);
    if (element) element.textContent = String(value).padStart(2, "0");
  }

  if (remaining === 0) {
    const caption = document.querySelector(".countdown-caption");
    if (caption) caption.textContent = "Төрсөн өдрийн мэнд хүргэе, Kuchupuchu! ♡";
  }
}

updateCountdown();
window.setInterval(updateCountdown, 1000);

const musicButton = document.querySelector("#music-toggle");
const musicLabel = document.querySelector("#music-label");
const musicDialog = document.querySelector("#music-dialog");
const musicFrame = document.querySelector("#music-player-frame");
const musicClose = document.querySelector("#music-close");
const musicVideoUrl = "https://www.youtube-nocookie.com/embed/GxldQ9eX2wo?autoplay=1&controls=1&playsinline=1&rel=0";

function resetMusicPlayer() {
  musicFrame?.removeAttribute("src");
  musicButton?.setAttribute("aria-pressed", "false");
  if (musicLabel) musicLabel.textContent = "Music";
}

musicButton?.addEventListener("click", () => {
  if (!musicDialog || !musicFrame || typeof musicDialog.showModal !== "function") {
    if (musicLabel) musicLabel.textContent = "Not supported";
    return;
  }

  if (musicDialog.open) {
    musicDialog.close();
    return;
  }

  musicFrame.src = musicVideoUrl;
  musicDialog.showModal();
  musicButton.setAttribute("aria-pressed", "true");
  if (musicLabel) musicLabel.textContent = "Close";
});

musicClose?.addEventListener("click", () => musicDialog?.close());
musicDialog?.addEventListener("close", resetMusicPlayer);
musicDialog?.addEventListener("click", (event) => {
  if (event.target === musicDialog) musicDialog.close();
});
