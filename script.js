// WMO 天気コードに対応する日本語と絵文字の定義関数
function getWeatherCategory(code) {
  switch (code) {
    case 0:
    case 1:
      return { text: '晴れ', icon: '☀️' };
    case 2:
    case 3:
      return { text: 'くもり', icon: '☁️' };
    case 45:
    case 48:
      return { text: '霧', icon: '🌫️' };
    case 51: case 53: case 55: case 56: case 57:
    case 61: case 63: case 65: case 66: case 67:
    case 80: case 81: case 82:
      return { text: '雨', icon: '☔' };
    case 71: case 73: case 75: case 77:
    case 85: case 86:
      return { text: '雪', icon: '❄️' };
    case 95:
    case 96:
    case 99:
      return { text: '雷雨', icon: '🌩️' };
    default:
      return { text: '不明', icon: '❓' };
  }
}

const locationSelect = document.getElementById('location-select');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const errorMessageEl = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const weatherCardsEl = document.getElementById('weather-cards');

// キャッシュ設定 (1時間 = 3,600,000 ミリ秒)
const CACHE_EXPIRATION_MS = 60 * 60 * 1000;

// 表示・非表示切り替え用ヘルパー関数
function toggleElement(el, show) {
  if (show) {
    el.classList.remove('hidden');
    el.removeAttribute('hidden');
  } else {
    el.classList.add('hidden');
    el.setAttribute('hidden', '');
  }
}

// API取得 兼 キャッシュ判定関数
async function fetchWeather(forceRefresh = false) {
  const selectedLocation = locationSelect.value;
  const [lat, lon] = selectedLocation.split(',');
  const cacheKey = `weather_data_${selectedLocation}`;

  // 強制更新でなければ、まずキャッシュを確認
  if (!forceRefresh) {
    const cachedDataString = localStorage.getItem(cacheKey);
    if (cachedDataString) {
      try {
        const cache = JSON.parse(cachedDataString);
        const now = Date.now();

        // キャッシュの期限判定（1時間以内か確認）
        if (now - cache.timestamp < CACHE_EXPIRATION_MS) {
          renderUI(cache.data);
          return; // キャッシュ有効ならAPIを叩かずに終了
        }
      } catch (e) {
        // パースエラー時はキャッシュを破棄して通常取得へ進む
        localStorage.removeItem(cacheKey);
      }
    }
  }

  // UI表示のリセット（「読み込み中」を表示）
  toggleElement(loadingEl, true);
  toggleElement(errorEl, false);
  toggleElement(weatherCardsEl, false);

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=2`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`サーバーエラー (HTTP ${response.status})`);
    }
    const data = await response.json();

    // 新しいデータをローカルストレージに保存
    const cachePayload = {
      timestamp: Date.now(),
      data: data
    };
    localStorage.setItem(cacheKey, JSON.stringify(cachePayload));

    // UIの描画
    renderUI(data);

  } catch (error) {
    toggleElement(loadingEl, false);
    errorMessageEl.textContent = `データの取得に失敗しました。(${error.message})`;
    toggleElement(errorEl, true);
  }
}

// 画面反映処理の分離
function renderUI(data) {
  updateCurrentWeatherUI(data.current);
  updateDayUI('today', data.daily, 0);
  updateDayUI('tomorrow', data.daily, 1);

  toggleElement(loadingEl, false);
  toggleElement(weatherCardsEl, true);
}

function updateCurrentWeatherUI(current) {
  if (!current) return;

  const weather = getWeatherCategory(current.weather_code);
  const temp = Math.round(current.temperature_2m);

  document.getElementById('current-icon').textContent = weather.icon;
  document.getElementById('current-text').textContent = weather.text;
  document.getElementById('current-temp').textContent = `${temp}℃`;
}

// UI更新処理
function updateDayUI(prefix, daily, index) {
  const code = daily.weather_code[index];
  const weather = getWeatherCategory(code);
  const maxTemp = Math.round(daily.temperature_2m_max[index]);
  const minTemp = Math.round(daily.temperature_2m_min[index]);
  const pop = daily.precipitation_probability_max[index];

  document.getElementById(`${prefix}-icon`).textContent = weather.icon;
  document.getElementById(`${prefix}-text`).textContent = weather.text;
  document.getElementById(`${prefix}-max`).textContent = `${maxTemp}℃`;
  document.getElementById(`${prefix}-min`).textContent = `${minTemp}℃`;

  const umbrellaEl = document.getElementById(`${prefix}-umbrella-advice`);
  if (pop >= 50) {
    umbrellaEl.textContent = `☔ 傘が必要です（降水確率 ${pop}%）`;
  } else if (pop >= 30) {
    umbrellaEl.textContent = `☂️ 折りたたみ傘があると安心（降水確率 ${pop}%）`;
  } else {
    umbrellaEl.textContent = `☀️ 傘は不要です（降水確率 ${pop}%）`;
  }
}

// イベントリスナー設定
locationSelect.addEventListener('change', () => fetchWeather(false));

// 「もう一度試す」ボタンはキャッシュを無視して強制再取得
retryBtn.addEventListener('click', () => fetchWeather(true));

// 初回データ読み込み
fetchWeather(false);