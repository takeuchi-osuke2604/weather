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

// API取得関数
async function fetchWeather() {
  const [lat, lon] = locationSelect.value.split(',');

  // UI表示のリセット（「読み込み中」を表示）
  toggleElement(loadingEl, true);
  toggleElement(errorEl, false);
  toggleElement(weatherCardsEl, false);

  // currentパラメータを除外してリクエストサイズを最適化
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=2`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`サーバーエラー (HTTP ${response.status})`);
    }
    const data = await response.json();

    // 今日（0）と明日（1）のUI更新
    updateDayUI('today', data.daily, 0);
    updateDayUI('tomorrow', data.daily, 1);

    // データ描画完了後にメインカードを表示
    toggleElement(loadingEl, false);
    toggleElement(weatherCardsEl, true);
  } catch (error) {
    // エラー時の処理
    toggleElement(loadingEl, false);
    errorMessageEl.textContent = `データの取得に失敗しました。(${error.message})`;
    toggleElement(errorEl, true);
  }
}

// UI更新処理
function updateDayUI(prefix, daily, index) {
  const code = daily.weather_code[index];
  const weather = getWeatherCategory(code);
  const maxTemp = Math.round(daily.temperature_2m_max[index]);
  const minTemp = Math.round(daily.temperature_2m_min[index]);
  const pop = daily.precipitation_probability_max[index];

  // 天気表示（テキスト ＋ 絵文字）
  document.getElementById(`${prefix}-icon`).textContent = weather.icon;
  document.getElementById(`${prefix}-text`).textContent = weather.text;
  document.getElementById(`${prefix}-max`).textContent = `${maxTemp}℃`;
  document.getElementById(`${prefix}-min`).textContent = `${minTemp}℃`;

  // 傘のアドバイス（降水確率）
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
locationSelect.addEventListener('change', fetchWeather);
retryBtn.addEventListener('click', fetchWeather);

// 初回データ読み込み
fetchWeather();