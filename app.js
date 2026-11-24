// ================= مشغل القرآن الكريم =================
// المطور: BMHEA58
// المصادر: mp3quran.net | alquran.cloud

const API_BASE = 'https://mp3quran.net/api/v3';

const SURAH_NAMES = [
    "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
    "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
    "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
    "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
    "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
    "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
    "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
    "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
    "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
    "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
    "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
    "المسد","الإخلاص","الفلق","الناس"
];

const reciterSelect = document.getElementById('reciter');
const surahSelect = document.getElementById('surah');
const modeSelect = document.getElementById('mode');
const player = document.getElementById('player');
const audio = document.getElementById('audio');
const nowPlaying = document.getElementById('nowPlaying');
const nowReciter = document.getElementById('nowReciter');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const downloadBtn = document.getElementById('downloadBtn');
const autoplayNext = document.getElementById('autoplayNext');
const highlightCheck = document.getElementById('highlight');
const showTranslation = document.getElementById('showTranslation');
const speedInput = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
const loading = document.getElementById('loading');
const errorBox = document.getElementById('error');
const quranText = document.getElementById('quranText');
const surahHeader = document.getElementById('surahHeader');
const ayahsContainer = document.getElementById('ayahsContainer');
const currentAyahLabel = document.getElementById('currentAyah');
const totalAyahsLabel = document.getElementById('totalAyahs');
const downloadProgress = document.getElementById('downloadProgress');
const dlFill = document.getElementById('dlFill');
const dlText = document.getElementById('dlText');

let reciters = [];
let currentReciter = null;
let currentSurahIndex = 0;
let currentAyahs = [];
let currentAyahIndex = 0;
let currentTranslations = [];
let currentSurahInfo = null;
let ayahDurations = [];

async function loadReciters() {
    try {
        loading.hidden = false;
        const res = await fetch(`${API_BASE}/reciters?language=ar`);
        if (!res.ok) throw new Error('فشل الاتصال بالخادم');
        const data = await res.json();
        reciters = data.reciters.filter(r => r.moshaf && r.moshaf.length > 0);
        reciterSelect.innerHTML = '<option value="">— اختر قارئاً —</option>';
        reciters.forEach((r, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = r.name;
            reciterSelect.appendChild(opt);
        });
        loading.hidden = true;
    } catch (err) {
        loading.hidden = true;
        showError('تعذر تحميل القراء: ' + err.message);
    }
}

reciterSelect.addEventListener('change', () => {
    const idx = reciterSelect.value;
    if (idx === '') return;
    currentReciter = reciters[idx];
    const moshaf = currentReciter.moshaf[0];
    const surahList = moshaf.surah_list.split(',').map(Number);
    surahSelect.innerHTML = '<option value="">— اختر سورة —</option>';
    surahList.forEach(num => {
        const opt = document.createElement('option');
        opt.value = num;
        opt.textContent = `${num}. سورة ${SURAH_NAMES[num - 1]}`;
        surahSelect.appendChild(opt);
    });
    surahSelect.disabled = false;
    player.hidden = true;
    quranText.hidden = true;
});

surahSelect.addEventListener('change', async () => {
    if (surahSelect.value === '') return;
    currentSurahIndex = parseInt(surahSelect.value);
    await playSurahWithText(currentSurahIndex);
});

async function playSurahWithText(surahNum) {
    if (!currentReciter) return;
    const moshaf = currentReciter.moshaf[0];
    const server = moshaf.server.endsWith('/') ? moshaf.server : moshaf.server + '/';
    const padded = String(surahNum).padStart(3, '0');
    const url = `${server}${padded}.mp3`;

    audio.src = url;
    nowPlaying.textContent = `سورة ${SURAH_NAMES[surahNum - 1]}`;
    nowReciter.textContent = currentReciter.name;
    player.hidden = false;
    audio.play().catch(() => {});

    if (modeSelect.value === 'both') {
        quranText.hidden = false;
        ayahsContainer.innerHTML = '<div class="quran-loading">⏳ جاري تحميل النص...</div>';
        try {
            const [info, result] = await Promise.all([
                fetchSurahInfo(surahNum),
                showTranslation.checked
                    ? fetchSurahWithTranslation(surahNum)
                    : fetchSurahText(surahNum).then(ayahs => ({ ayahs, translations: [] }))
            ]);
            currentAyahs = result.ayahs;
            currentAyahIndex = 0;
            renderSurah(result.ayahs, info, result.translations);
            totalAyahsLabel.textContent = `إجمالي الآيات: ${result.ayahs.length}`;
        } catch (err) {
            ayahsContainer.innerHTML = '<div class="quran-loading">⚠️ تعذر تحميل النص</div>';
            showError('النص: ' + err.message);
        }
    } else {
        quranText.hidden = true;
    }
    currentAyahIndex = 0;
    currentAyahLabel.textContent = 'الآية: —';
}

function renderSurah(ayahs, info, translations = []) {
    currentTranslations = translations;
    currentSurahInfo = info;
    surahHeader.innerHTML = `
        <h2>سورة ${info.name}</h2>
        <div class="meta">
            ${info.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} •
            عدد الآيات: ${info.ayahCount} • ${info.englishName}
        </div>`;
    ayahsContainer.innerHTML = '';
    ayahs.forEach((a, i) => {
        const span = document.createElement('span');
        span.className = 'ayah';
        span.dataset.index = i;
        let html = `${a.text} <span class="ayah-number">${a.number}</span> `;
        if (translations[i]) {
            html += `<span class="ayah-translation">${translations[i]}</span>`;
        }
        span.innerHTML = html;
        span.addEventListener('click', () => jumpToAyah(i));
        ayahsContainer.appendChild(span);
    });
    updateTranslationVisibility();
    ayahsContainer.scrollTop = 0;
}

function updateTranslationVisibility() {
    ayahsContainer.classList.toggle('no-translation', !showTranslation.checked);
}

showTranslation.addEventListener('change', async () => {
    updateTranslationVisibility();
    if (showTranslation.checked && currentAyahs.length && !currentTranslations.length) {
        try {
            currentTranslations = await fetchSurahTranslation(currentSurahIndex);
            renderSurah(currentAyahs, currentSurahInfo, currentTranslations);
        } catch (e) {
            showError('تعذر تحميل الترجمة');
        }
    }
});

function computeAyahDurations(totalSeconds) {
    if (!currentAyahs.length || !totalSeconds) return [];
    const weights = currentAyahs.map(a => a.text.length);
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    return weights.map(w => (w / totalWeight) * totalSeconds);
}

function updateActiveAyahByTime() {
    if (!highlightCheck.checked) return;
    if (!currentAyahs.length) return;
    if (!audio.duration) return;
    if (!ayahDurations.length || ayahDurations._forDuration !== audio.duration) {
        ayahDurations = computeAyahDurations(audio.duration);
        ayahDurations._forDuration = audio.duration;
    }
    const t = audio.currentTime;
    let acc = 0, newIndex = 0;
    for (let i = 0; i < ayahDurations.length; i++) {
        acc += ayahDurations[i];
        if (t <= acc) { newIndex = i; break; }
        newIndex = i;
    }
    if (newIndex !== currentAyahIndex) setActiveAyah(newIndex);
}

function setActiveAyah(index) {
    const prev = ayahsContainer.querySelector('.ayah.active');
    if (prev) prev.classList.remove('active');
    const el = ayahsContainer.querySelector(`.ayah[data-index="${index}"]`);
    if (el) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    currentAyahIndex = index;
    currentAyahLabel.textContent = `الآية: ${index + 1}`;
}

audio.addEventListener('timeupdate', () => {
    if (modeSelect.value !== 'both') return;
    updateActiveAyahByTime();
});

audio.addEventListener('loadedmetadata', () => { ayahDurations = []; });

function jumpToAyah(index) {
    if (!audio.duration || !ayahDurations.length) return;
    let time = 0;
    for (let i = 0; i < index; i++) time += ayahDurations[i];
    audio.currentTime = time;
    setActiveAyah(index);
    audio.play();
}

playPauseBtn.addEventListener('click', () => {
    if (audio.paused) audio.play(); else audio.pause();
});
audio.addEventListener('play', () => playPauseBtn.textContent = '⏸️');
audio.addEventListener('pause', () => playPauseBtn.textContent = '▶️');

prevBtn.addEventListener('click', () => {
    if (currentSurahIndex > 1) playSurahWithText(currentSurahIndex - 1);
});
nextBtn.addEventListener('click', () => {
    if (currentSurahIndex < 114) playSurahWithText(currentSurahIndex + 1);
});

audio.addEventListener('ended', () => {
    if (autoplayNext.checked && currentSurahIndex < 114) {
        playSurahWithText(currentSurahIndex + 1);
    }
});

speedInput.addEventListener('input', () => {
    audio.playbackRate = parseFloat(speedInput.value);
    speedVal.textContent = parseFloat(speedInput.value).toFixed(1) + 'x';
});

modeSelect.addEventListener('change', () => {
    if (modeSelect.value === 'audio') quranText.hidden = true;
    else if (currentAyahs.length) quranText.hidden = false;
});

highlightCheck.addEventListener('change', () => {
    if (!highlightCheck.checked) {
        const prev = ayahsContainer.querySelector('.ayah.active');
        if (prev) prev.classList.remove('active');
    }
});

// ================= تحميل السورة =================
downloadBtn.addEventListener('click', async () => {
    if (!currentReciter || !currentSurahIndex) {
        showError('اختر قارئاً وسورة أولاً');
        return;
    }
    const moshaf = currentReciter.moshaf[0];
    const server = moshaf.server.endsWith('/') ? moshaf.server : moshaf.server + '/';
    const padded = String(currentSurahIndex).padStart(3, '0');
    const url = `${server}${padded}.mp3`;
    const filename = `${SURAH_NAMES[currentSurahIndex - 1]} - ${currentReciter.name}.mp3`;

    try {
        downloadBtn.disabled = true;
        downloadProgress.hidden = false;
        dlFill.style.width = '0%';
        dlText.textContent = '0%';

        const response = await fetch(url);
        if (!response.ok) throw new Error('فشل التحميل');

        const contentLength = +response.headers.get('Content-Length') || 0;
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            if (contentLength) {
                const percent = Math.round((received / contentLength) * 100);
                dlFill.style.width = percent + '%';
                dlText.textContent = percent + '%';
            } else {
                dlText.textContent = (received / 1024 / 1024).toFixed(1) + ' MB';
            }
        }

        const blob = new Blob(chunks, { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        dlText.textContent = '✅ تم';
        setTimeout(() => { downloadProgress.hidden = true; }, 2000);

        if ('caches' in window) {
            const cache = await caches.open('quran-audio-v1');
            await cache.put(url, new Response(blob));
        }
    } catch (err) {
        showError('فشل التحميل: ' + err.message);
        downloadProgress.hidden = true;
    } finally {
        downloadBtn.disabled = false;
    }
});

function showError(msg) {
    errorBox.textContent = '⚠️ ' + msg;
    errorBox.hidden = false;
    setTimeout(() => errorBox.hidden = true, 5000);
}

// ================= PWA =================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ SW:', reg.scope))
            .catch(err => console.warn('⚠️ SW', err));
    });
}

let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
});

window.addEventListener('appinstalled', () => { installBtn.hidden = true; });

const offlineBadge = document.getElementById('offlineBadge');
function updateOnlineStatus() { offlineBadge.hidden = navigator.onLine; }
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

audio.addEventListener('loadedmetadata', () => {
    if ('caches' in window && audio.src.startsWith('http')) {
        caches.open('quran-audio-v1').then(cache => {
            cache.match(audio.src).then(found => {
                if (!found) {
                    fetch(audio.src).then(r => {
                        if (r.ok) cache.put(audio.src, r);
                    }).catch(() => {});
                }
            });
        });
    }
});

// ================= دعم متعدد المنصات =================
const platform = (() => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Win/.test(navigator.platform)) return 'windows';
    if (/Mac/.test(navigator.platform)) return 'mac';
    if (/Linux/.test(navigator.platform)) return 'linux';
    return 'other';
})();
console.log('🖥️ المنصة:', platform);

function showIOSInstallHint() {
    const isIOS = platform === 'ios';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                       || window.navigator.standalone === true;
    if (isIOS && !isStandalone) {
        const hint = document.createElement('div');
        hint.className = 'ios-install-hint';
        hint.innerHTML = `
            <div class="ios-hint-content">
                <button class="close-hint">✕</button>
                <h3>📲 ثبّت التطبيق</h3>
                <p>اضغط <strong>مشاركة</strong> <span class="ios-share">⬆️</span> ثم <strong>إضافة إلى الشاشة الرئيسية</strong></p>
            </div>`;
        document.body.appendChild(hint);
        hint.querySelector('.close-hint').onclick = () => hint.remove();
        setTimeout(() => hint.remove(), 15000);
    }
}
window.addEventListener('load', () => setTimeout(showIOSInstallHint, 3000));

if ('mediaSession' in navigator) {
    audio.addEventListener('play', () => {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: nowPlaying.textContent,
            artist: nowReciter.textContent,
            album: 'القرآن الكريم',
            artwork: [
                { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' }
            ]
        });
    });
    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (currentSurahIndex > 1) playSurahWithText(currentSurahIndex - 1);
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (currentSurahIndex < 114) playSurahWithText(currentSurahIndex + 1);
    });
}

loadReciters();
