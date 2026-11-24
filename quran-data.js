// ============ تحميل بيانات القرآن ============
// المصدر: AlQuran Cloud API
// المطور: BMHEA58

const QURAN_API = 'https://api.alquran.cloud/v1';
const surahCache = {};
const translationCache = {};

async function fetchSurahText(surahNum) {
    if (surahCache[surahNum]) return surahCache[surahNum];
    const res = await fetch(`${QURAN_API}/surah/${surahNum}/quran-uthmani`);
    if (!res.ok) throw new Error('فشل تحميل نص السورة');
    const data = await res.json();
    const ayahs = data.data.ayahs.map(a => ({
        number: a.numberInSurah,
        text: a.text,
        juz: a.juz,
        page: a.page
    }));
    surahCache[surahNum] = ayahs;
    return ayahs;
}

async function fetchSurahInfo(surahNum) {
    const res = await fetch(`${QURAN_API}/surah/${surahNum}`);
    if (!res.ok) throw new Error('فشل تحميل معلومات السورة');
    const data = await res.json();
    return {
        name: data.data.name,
        englishName: data.data.englishName,
        ayahCount: data.data.numberOfAyahs,
        revelationType: data.data.revelationType
    };
}

async function fetchSurahTranslation(surahNum) {
    if (translationCache[surahNum]) return translationCache[surahNum];
    const res = await fetch(`${QURAN_API}/surah/${surahNum}/en.sahih`);
    if (!res.ok) throw new Error('فشل تحميل الترجمة');
    const data = await res.json();
    const translations = data.data.ayahs.map(a => a.text);
    translationCache[surahNum] = translations;
    return translations;
}

async function fetchSurahWithTranslation(surahNum) {
    const [ayahs, translations] = await Promise.all([
        fetchSurahText(surahNum),
        fetchSurahTranslation(surahNum).catch(() => [])
    ]);
    return { ayahs, translations };
}
