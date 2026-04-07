/**
 * player.js — Spotify Display
 * Polls /current and updates the player UI.
 * API shape: { playing, track, artist, album_art, progress, duration }
 */

const POLL_MS = 2500;

const playerEl      = document.getElementById('player');
const idleEl        = document.getElementById('idle-screen');
const trackEl       = document.getElementById('track');
const artistEl      = document.getElementById('artist');
const artEl         = document.getElementById('art');
const glowEl        = document.querySelector('.art-glow');
const progressFill  = document.getElementById('progress-fill');
const timeCurrent   = document.getElementById('time-current');
const timeTotal     = document.getElementById('time-total');

let lastTrack       = null;
let progressMs      = 0;
let durationMs      = 0;
let tickInterval    = null;

/* ── Helpers ──────────────────────────────── */

function fmt(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function setProgress(progress, duration) {
    progressMs = progress;
    durationMs = duration;
    const pct  = duration > 0 ? (progress / duration) * 100 : 0;
    progressFill.style.width = `${pct}%`;
    timeCurrent.textContent  = fmt(progress);
    timeTotal.textContent    = fmt(duration);
}

/** Tick the progress bar forward every second between polls. */
function startTick() {
    clearInterval(tickInterval);
    tickInterval = setInterval(() => {
        if (progressMs < durationMs) {
            progressMs += 1000;
            setProgress(progressMs, durationMs);
        }
    }, 1000);
}

function swapText(el, text) {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => {
        el.textContent     = text;
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
    }, 250);
}

function syncGlow(src) {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    const img    = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        canvas.width = canvas.height = 4;
        ctx.drawImage(img, 0, 0, 4, 4);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        if (glowEl) {
            glowEl.style.background =
                `radial-gradient(circle, rgba(${r},${g},${b},0.45) 0%, transparent 70%)`;
        }
    };
    img.src = src;
}

/* ── Main fetch ───────────────────────────── */

async function fetchCurrent() {
    try {
        const res  = await fetch('/current');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!data.playing) {
            // Nothing playing — show idle screen
            playerEl.classList.add('hidden');
            idleEl.classList.add('visible');
            clearInterval(tickInterval);
            return;
        }

        // Back to playing
        playerEl.classList.remove('hidden');
        idleEl.classList.remove('visible');

        // Only animate text/art when the track changes
        if (data.track !== lastTrack) {
            lastTrack = data.track;
            swapText(trackEl,  data.track  ?? 'Unknown Track');
            swapText(artistEl, data.artist ?? '');

            // Crossfade album art
            artEl.style.opacity = '0';
            setTimeout(() => {
                artEl.src          = data.album_art ?? '';
                artEl.style.opacity = '1';
            }, 250);

            if (data.album_art) syncGlow(data.album_art);
        }

        // Always sync progress (may have seeked)
        setProgress(data.progress ?? 0, data.duration ?? 0);
        startTick();

    } catch (err) {
        console.error('[player] fetch error:', err);
    }
}

/* ── Boot ─────────────────────────────────── */
fetchCurrent();
setInterval(fetchCurrent, POLL_MS);