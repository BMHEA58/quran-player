// ================= مشغل القرآن الكريم - BMHEA58 =================

const API_BASE = 'https://mp3quran.net/api/v3';
const EVERYAYAH_BASE = 'https://everyayah.com/data';

// خريطة أسماء القراء (MP3Quran) إلى معرفات EveryAyah
// يمكن توسيعها لاحقاً
const RECITER_MAP = {
    "مشاري راشد العفاسي": "Alafasy_128kbps",
    "عبد الباسط عبد الصمد": "Abdul_Basit_Murattal_192kbps",
    "محمود خليل الحصري": "Husary_128kbps",
    "محمد صديق المنشاوي": "Minshawy_Murattal_128kbps",
    "سعد الغامدي": "Ghamadi_40kbps",
    "ماهر المعيقلي": "Maher_AlMuaiqly_64kbps",
    "عبد الرحمن السديس": "Abdurrahmaan_As-Sudais_192kbps",
    "أحمد بن علي العجمي": "ahmed_ibn_ali_al_ajamy_128kbps",
    "ياسر الدوسري": "Yasser_Ad-Dussary_128kbps",
    "علي الحذيفي": "Ali_Hudhaify_128kbps",
    "محمد أيوب": "Muhammad_Ayyoub_128kbps",
    "إبراهيم الأخضر": "Ibrahim_Akhdar_32kbps",
    "خالد القحطاني": "Khalid_AlQahtani_128kbps",
    "ناصر القطامي": "Nasser_Alqatami_128kbps",
    "فارس عباد": "Fares_Abbad_64kbps",
};

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

// ============ العناصر ============
const audio = document.getElementById('audio');
const reciterSearch = document.getElementById('reciterSearch');
const reciterDropdown = document.getElementById('reciterDropdown');
const surahSelect = document.getElementById('surahSelect');
const modeSelect = document.getElementById('modeSelect');
const nowPlayingCard = document.getElementById('nowPlayingCard');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowReciterName = document.getElementById('nowReciterName');
const currentAyahBadge = document.getElementById('currentAyahBadge');
const autoplayNext = document.getElementById('autoplayNext');
const highlightAyah = document.getElementById('highlightAyah');
const showTranslation = document.getElementById('showTranslation');
const speedRange = document.getElementById('speedRange');
const speedLabel = document.getElementById('speedLabel');
const textColumn = document.getElementById('textColumn');
const surahHeader = document.getElementById('surahHeader');
const ayahsContainer = document.getElementById('ayahsContainer');
const stickyPlayer = document.getElementById('stickyPlayer');
const spTitle = document.getElementById('spTitle');
const spReciter = document.getElementById('spReciter');
const spPlayPause = document.getElementById('spPlayPause');
const spPrev = document.getElementById('spPrev');
const spNext = document.getElementById('spNext');
const spDownload = document.getElementById('spDownload');
const spSeek = document.getElementById('spSeek');
const spCurrentTime = document.getElementById('spCurrentTime');
const spDuration = document.getElementById('spDuration');
const loadingOverlay = document.getElementById('loading');
const errorToast = document.getElementById('errorToast');
const randomBtn = document.getElementById('randomBtn');
const downloadProgress = document.getElementById('downloadProgress');
const dlFill = document.getElementById('dlFill');
const dlText = document.getElementById('dlText');

// ============ الحالة ============
let reciters = [];
let currentReciter = null;
let currentSurahNum = 0;
let currentAyahs = [];        // نصوص الآيات
let currentTranslations = [];
let currentSurahInfo = null;
let currentAyahIndex = 0;
let playbackMode = 'surah';   // 'surah' أو 'ayah'
let isPlaying = false;
let ayahQueue = [];
let queueIndex = 0;
let everyayahSlug = null;

// ============ أدوات مساعدة ============
function showError(msg) {
    errorToast.textContent = '⚠️ ' + msg;
    errorToast.hidden = false;
    setTimeout(() => { errorToast.hidden = true; }, 4000);
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'grid' : 'none';
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============ تحميل قائمة القراء ============
async function loadReciters() {
    try {
        showLoading(true);
        const res = await fetch(`${API_BASE}/reciters?language=ar`);
        if (!res.ok) throw new Error('فشل الاتصال');
        const data = await res.json();
        reciters = data.reciters.filter(r => r.moshaf && r.moshaf.length > 0);
        renderReciterDropdown(reciters);
        showLoading(false);
    } catch (err) {
        showLoading(false);
        showError('تعذر تحميل القراء: ' + err.message);
    }
}

// ============ القائمة القابلة للبحث ============
function renderReciterDropdown(list) {
    reciterDropdown.innerHTML = '';
    if (!list.length) {
        reciterDropdown.innerHTML = '<div style="padding:1rem;color:#888">لا نتائج</div>';
        return;
    }
    list.forEach((r, idx) => {
        const div = document.createElement('div');
        div.textContent = r.name;
        div.dataset.index = reciters.indexOf(r); // الفهرس الأصلي
        div.addEventListener('click', () => selectReciter(r));
        reciterDropdown.appendChild(div);
    });
}

reciterSearch.addEventListener('input', () => {
    const q = reciterSearch.value.trim().toLowerCase();
    const filtered = reciters.filter(r => r.name.toLowerCase().includes(q));
    renderReciterDropdown(filtered);
    reciterDropdown.hidden = false;
});

reciterSearch.addEventListener('focus', () => {
    renderReciterDropdown(reciters);
    reciterDropdown.hidden = false;
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#reciterSelectWrapper')) {
        reciterDropdown.hidden = true;
    }
});

function selectReciter(reciter) {
    currentReciter = reciter;
    reciterSearch.value = reciter.name;
    reciterDropdown.hidden = true;

    // البحث عن slug في EveryAyah
    everyayahSlug = RECITER_MAP[reciter.name] || null;

    // تعبئة السور
    const moshaf = reciter.moshaf[0];
    const surahList = moshaf.surah_list.split(',').map(Number);
    surahSelect.innerHTML = '<option value="">— اختر سورة —</option>';
    surahList.forEach(num => {
        const opt = document.createElement('option');
        opt.value = num;
        opt.textContent = `${num}. ${SURAH_NAMES[num - 1]}`;
        surahSelect.appendChild(opt);
    });
    surahSelect.disabled = false;
    nowPlayingCard.hidden = true;
    textColumn.hidden = true;
    stickyPlayer.hidden = true;
}

// ============ تغيير السورة ============
surahSelect.addEventListener('change', async () => {
    const num = parseInt(surahSelect.value);
    if (!num) return;
    currentSurahNum = num;
    await loadSurah(num);
});

// ============ تحميل السورة (نص + إعداد التشغيل) ============
async function loadSurah(surahNum) {
    if (!currentReciter) return;
    showLoading(true);

    try {
        // جلب النص + الترجمة إذا مطلوبة
        const [info, result] = await Promise.all([
            fetchSurahInfo(surahNum),
            showTranslation.checked
                ? fetchSurahWithTranslation(surahNum)
                : fetchSurahText(surahNum).then(ayahs => ({ ayahs, translations: [] }))
        ]);
        currentAyahs = result.ayahs;
        currentTranslations = result.translations;
        currentSurahInfo = info;
        currentAyahIndex = 0;

        renderSurahText();
        updateNowPlayingUI();

        // إذا كان القارئ مدعوماً في EveryAyah -> تشغيل آية بآية
        if (everyayahSlug) {
            startAyahByAyah();
        } else {
            // fallback: تشغيل التلاوة الكاملة من MP3Quran
            playFullSurah();
        }

        textColumn.hidden = false;
        stickyPlayer.hidden = false;
        showLoading(false);
    } catch (err) {
        showLoading(false);
        showError('تعذر تحميل السورة: ' + err.message);
    }
}

// ============ عرض النص ============
function renderSurahText() {
    surahHeader.innerHTML = `
        <h2>سورة ${currentSurahInfo.name}</h2>
        <div class="meta">
            ${currentSurahInfo.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} •
            عدد الآيات: ${currentSurahInfo.ayahCount}
        </div>`;

    ayahsContainer.innerHTML = '';
    currentAyahs.forEach((a, i) => {
        const span = document.createElement('span');
        span.className = 'ayah';
        span.dataset.index = i;
        let html = `${a.text} <span class="ayah-number">${a.number}</span>`;
        if (currentTranslations[i]) {
            html += `<span class="ayah-translation">${currentTranslations[i]}</span>`;
        }
        span.innerHTML = html;
        span.addEventListener('click', () => jumpToAyah(i));
        ayahsContainer.appendChild(span);
    });
    ayahsContainer.classList.toggle('no-translation', !showTranslation.checked);
}

// ============ تحديث واجهة "الآن يُشغَّل" ============
function updateNowPlayingUI() {
    nowPlayingCard.hidden = false;
    nowPlayingTitle.textContent = `سورة ${SURAH_NAMES[currentSurahNum - 1]}`;
    nowReciterName.textContent = currentReciter.name;
    spTitle.textContent = `سورة ${SURAH_NAMES[currentSurahNum - 1]}`;
    spReciter.textContent = currentReciter.name;
}

// ============ التشغيل: آية بآية (تزامن دقيق) ============
function startAyahByAyah() {
    playbackMode = 'ayah';
    ayahQueue = currentAyahs.map(a => a.number); // أرقام الآيات
    queueIndex = 0;
    playAyah(queueIndex);
}

async function playAyah(index) {
    if (!everyayahSlug || index >= currentAyahs.length) {
        // انتهت السورة -> السورة التالية إذا مفعل
        if (autoplayNext.checked && currentSurahNum < 114) {
            nextSurah();
        }
        return;
    }

    queueIndex = index;
    const ayahNum = currentAyahs[index].number;
    const surahPadded = String(currentSurahNum).padStart(3, '0');
    const ayahPadded = String(ayahNum).padStart(3, '0');
    const url = `${EVERYAYAH_BASE}/${everyayahSlug}/${surahPadded}${ayahPadded}.mp3`;

    audio.src = url;
    try {
        await audio.play();
        isPlaying = true;
        spPlayPause.textContent = '⏸️';
    } catch (e) {
        // المتصفح قد يمنع التشغيل التلقائي
        console.warn('التشغيل التلقائي ممنوع:', e);
    }

    setActiveAyah(index);
}

// عند انتهاء الآية -> التالية
audio.addEventListener('ended', () => {
    if (playbackMode === 'ayah') {
        if (queueIndex + 1 < currentAyahs.length) {
            playAyah(queueIndex + 1);
        } else if (autoplayNext.checked && currentSurahNum < 114) {
            nextSurah();
        }
    }
    // في وضع السورة الكاملة، يتم التعامل عبر حدث آخر أدناه
});

// ============ التشغيل: السورة الكاملة (Fallback) ============
function playFullSurah() {
    playbackMode = 'surah';
    const moshaf = currentReciter.moshaf[0];
    const server = moshaf.server.endsWith('/') ? moshaf.server : moshaf.server + '/';
    const padded = String(currentSurahNum).padStart(3, '0');
    audio.src = `${server}${padded}.mp3`;
    audio.play().catch(() => {});
    isPlaying = true;
    spPlayPause.textContent = '⏸️';
    setActiveAyah(0);
}

// ============ تعيين الآية النشطة ============
function setActiveAyah(index) {
    const prev = ayahsContainer.querySelector('.ayah.active');
    if (prev) prev.classList.remove('active');
    const el = ayahsContainer.querySelector(`.ayah[data-index="${index}"]`);
    if (el) {
        el.classList.add('active');
        if (highlightAyah.checked) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    currentAyahIndex = index;
    currentAyahBadge.textContent = `الآية: ${index + 1} / ${currentAyahs.length}`;
}

// ============ القفز إلى آية ============
function jumpToAyah(index) {
    if (playbackMode === 'ayah') {
        playAyah(index);
    } else {
        // في وضع السورة الكاملة، تقدير الوقت (قد لا يكون دقيقاً)
        if (!audio.duration) return;
        const ratio = index / currentAyahs.length;
        audio.currentTime = audio.duration * ratio;
        setActiveAyah(index);
    }
}

// ============ التحكم بالمشغل ============
function togglePlay() {
    if (audio.paused) {
        audio.play();
        isPlaying = true;
        spPlayPause.textContent = '⏸️';
    } else {
        audio.pause();
        isPlaying = false;
        spPlayPause.textContent = '▶️';
    }
}

spPlayPause.addEventListener('click', togglePlay);

audio.addEventListener('play', () => { spPlayPause.textContent = '⏸️'; isPlaying = true; });
audio.addEventListener('pause', () => { spPlayPause.textContent = '▶️'; isPlaying = false; });

// السابق / التالي
function prevSurah() {
    if (currentSurahNum > 1) {
        currentSurahNum--;
        surahSelect.value = currentSurahNum;
        loadSurah(currentSurahNum);
    }
}

function nextSurah() {
    if (currentSurahNum < 114) {
        currentSurahNum++;
        surahSelect.value = currentSurahNum;
        loadSurah(currentSurahNum);
    }
}

spPrev.addEventListener('click', prevSurah);
spNext.addEventListener('click', nextSurah);

// شريط التقدم
audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    spSeek.value = pct;
    spCurrentTime.textContent = formatTime(audio.currentTime);
    spDuration.textContent = formatTime(audio.duration);

    // في وضع السورة الكاملة، نحدّث الآية النشطة تقديرياً
    if (playbackMode === 'surah' && highlightAyah.checked && currentAyahs.length) {
        const ratio = audio.currentTime / audio.duration;
        const approxIndex = Math.min(Math.floor(ratio * currentAyahs.length), currentAyahs.length - 1);
        if (approxIndex !== currentAyahIndex) {
            setActiveAyah(approxIndex);
        }
    }
});

spSeek.addEventListener('input', () => {
    if (!audio.duration) return;
    audio.currentTime = (spSeek.value / 100) * audio.duration;
});

// سرعة التشغيل
speedRange.addEventListener('input', () => {
    audio.playbackRate = parseFloat(speedRange.value);
    speedLabel.textContent = parseFloat(speedRange.value).toFixed(1) + 'x';
});

// ============ الترجمة ============
showTranslation.addEventListener('change', async () => {
    ayahsContainer.classList.toggle('no-translation', !showTranslation.checked);
    if (showTranslation.checked && currentAyahs.length && !currentTranslations.length) {
        try {
            currentTranslations = await fetchSurahTranslation(currentSurahNum);
            renderSurahText();
        } catch (e) {
            showError('تعذر تحميل الترجمة');
        }
    }
});

// ============ الوضع (نص + صوت / صوت فقط) ============
modeSelect.addEventListener('change', () => {
    if (modeSelect.value === 'audio') {
        textColumn.hidden = true;
    } else if (currentAyahs.length) {
        textColumn.hidden = false;
    }
});

// ============ التشغيل العشوائي ============
randomBtn.addEventListener('click', () => {
    if (!reciters.length) return;
    const randomReciter = reciters[Math.floor(Math.random() * reciters.length)];
    selectReciter(randomReciter);

    const surahList = randomReciter.moshaf[0].surah_list.split(',').map(Number);
    const randomSurah = surahList[Math.floor(Math.random() * surahList.length)];
    currentSurahNum = randomSurah;
    surahSelect.value = randomSurah;
    loadSurah(randomSurah);
});

// ============ تحميل السورة ============
spDownload.addEventListener('click', async () => {
    if (!currentReciter || !currentSurahNum) return;
    const moshaf = currentReciter.moshaf[0];
    const server = moshaf.server.endsWith('/') ? moshaf.server : moshaf.server + '/';
    const padded = String(currentSurahNum).padStart(3, '0');
    const url = `${server}${padded}.mp3`;
    const filename = `${SURAH_NAMES[currentSurahNum - 1]} - ${currentReciter.name}.mp3`;

    try {
        spDownload.disabled = true;
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
                const pct = Math.round((received / contentLength) * 100);
                dlFill.style.width = pct + '%';
                dlText.textContent = pct + '%';
            } else {
                dlText.textContent = (received / 1024 / 1024).toFixed(1) + ' MB';
            }
        }

        const blob = new Blob(chunks, { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.click();        URL.revokeObjectURL(blobUrl);

        dlText.textContent = '✅ تم';
        setTimeout(() => { downloadProgress.hidden = true; }, 1500);
    } catch (err) {
        showError('فشل التحميل: ' + err.message);
        downloadProgress.hidden = true;
    } finally {
        spDownload.disabled = false;
    }
});

// ============ PWA ============
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
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

// مؤشر الاتصال
const offlineBadge = document.getElementById('offlineBadge');
function updateOnline() { offlineBadge.hidden = navigator.onLine; }
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);
updateOnline();

// ============ بدء التشغيل ============
loadReciters();
