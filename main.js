// ★ ここだけあなたが編集する想定 ★
const soundNames = {
  A: "いびきpiyo",
  B: "らいおんfuga",
  C: "男咳払いneko",
  D: "アアーッinu",
  E: "大当たりmofu",
  F: "ムシューダ",
  G: "tako"
};

const MAX_BUTTONS = 26; // A〜Z

// WebAudio 初期化
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let currentSource = null;
let gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);

// ★ Speed スライダー取得
const speedSlider = document.getElementById("speed");


if (false){
  // ★ Speed の保存
  speedSlider.addEventListener("input", () => {
    localStorage.setItem("speed", speedSlider.value);
  });

  // ★ Speed の読み込み
  const savedSpeed = localStorage.getItem("speed");
  if (savedSpeed) speedSlider.value = savedSpeed;
}

// ループ制御用
let loopLetter = null;

// タイマー制御用
let timerId = null;
let timerRemainingMs = 0;
let timerIntervalId = null;

const nowPlayingEl = document.getElementById("nowPlaying");
const timerStatusEl = document.getElementById("timerStatus");
const buttonCountInput = document.getElementById("buttonCount");
const applyButtonCountBtn = document.getElementById("applyButtonCount");
const loopCheckbox = document.getElementById("loop");
const intervalInput = document.getElementById("interval");
const timerInput = document.getElementById("timer");
const applyTimerBtn = document.getElementById("applyTimer");
const volumeSlider = document.getElementById("volume");
const soundButtonsContainer = document.getElementById("soundButtons");

function letterFromIndex(i) {
  return String.fromCharCode(65 + i); // 65 = 'A'
}

function updateNowPlaying(letter) {
  if (!letter) {
    nowPlayingEl.hidden = true;
    nowPlayingEl.textContent = "";
    return;
  }
  const displayName = soundNames[letter] || letter;
  nowPlayingEl.hidden = false;
  nowPlayingEl.textContent = `🎵 再生中：${displayName}（${letter}.mp3）`;
}

function stopCurrentSound() {
  if (currentSource) {
    try {
      currentSource.onended = null;
      currentSource.stop();
    } catch (e) {
      console.warn("stop error:", e);
    }
    currentSource = null;
  }
  loopLetter = null;
  updateNowPlaying(null);
}

function playSound(letter) {
  // タップ時に AudioContext を再開（モバイル対策）
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const file = `sounds/${letter}.mp3`;
  const displayName = soundNames[letter] || letter;

  // 前の音を止める
  stopCurrentSound();

  fetch(file)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then(buf => audioCtx.decodeAudioData(buf))
    .then(decoded => {
      const src = audioCtx.createBufferSource();
      src.buffer = decoded;
      src.connect(gainNode);
      src.start(0);
      src.playbackRate.value = Number(speedSlider.value) || 1;
      currentSource = src;
      updateNowPlaying(letter);

      const doLoop = loopCheckbox.checked;
      const intervalMs = Math.max(0, Number(intervalInput.value) || 0) * 1000;

      if (doLoop) {
        loopLetter = letter;
        src.onended = () => {
          // タイマーが切れていたらループしない
          if (timerRemainingMs <= 0 && timerId !== null) {
            stopCurrentSound();
            return;
          }
          setTimeout(() => {
            if (loopLetter === letter) {
              playSound(letter);
            }
          }, intervalMs);
        };
      } else {
        loopLetter = null;
        src.onended = () => {
          updateNowPlaying(null);
        };
      }
    })
    .catch(err => {
      console.error(`再生エラー: ${file}`, err);
      updateNowPlaying(null);
    });
}

function generateButtons() {
  let count = Number(buttonCountInput.value) || 1;
  if (count < 1) count = 1;
  if (count > MAX_BUTTONS) count = MAX_BUTTONS;
  buttonCountInput.value = count;

  soundButtonsContainer.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const letter = letterFromIndex(i);
    const btn = document.createElement("button");
    btn.className = "sound-btn";
    btn.textContent = soundNames[letter] || letter;
    btn.addEventListener("click", () => playSound(letter));
    soundButtonsContainer.appendChild(btn);
  }
  localStorage.setItem("buttonCount", count);
}

function clearTimer() {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
  if (timerIntervalId !== null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  timerRemainingMs = 0;
  timerStatusEl.hidden = true;
  timerStatusEl.textContent = "";
}

function startTimer(minutes) {
  clearTimer();
  if (!minutes || minutes <= 0) return;

  timerRemainingMs = minutes * 60 * 1000;
  const endTime = Date.now() + timerRemainingMs;

  timerStatusEl.hidden = false;

  function updateTimerDisplay() {
    const now = Date.now();
    timerRemainingMs = endTime - now;
    if (timerRemainingMs <= 0) {
      timerStatusEl.textContent = "Timer：00:00（終了）";
      clearTimer();
      stopCurrentSound();
      return;
    }
    const totalSec = Math.floor(timerRemainingMs / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    timerStatusEl.textContent = `Timer：${m}:${s}`;
  }

  updateTimerDisplay();
  timerIntervalId = setInterval(updateTimerDisplay, 1000);

  timerId = setTimeout(() => {
    // 念のため二重終了
    clearTimer();
    stopCurrentSound();
  }, timerRemainingMs + 1000);
}

// イベント設定
applyButtonCountBtn.addEventListener("click", generateButtons);

volumeSlider.addEventListener("input", e => {
  const v = Number(e.target.value);
  gainNode.gain.value = isNaN(v) ? 1 : v;
});

// Timer 適用
applyTimerBtn.addEventListener("click", () => {
  const minutes = Number(timerInput.value);
  if (!minutes || minutes <= 0) {
    clearTimer();
    return;
  }
  startTimer(minutes);
});

// 初期化
generateButtons();
gainNode.gain.value = Number(volumeSlider.value) || 1;