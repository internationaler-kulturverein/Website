// config.js
// Enthält globale Konfigurationen, Konstanten und CSS-Klassennamen.

export const prayerTimesConfig = [
    {
        name: 'Fajr',
        idMobileRow: 'rowFajr',
        idTimeMobile: 'Fajr',
        idTimeDesktop: 'Fajr_wide',
        adhanDurationMinutes: 2,
        iqamaDurationMinutes: 10,
    },
    {
        name: 'Dhuhr',
        idMobileRow: 'rowDhuhr',
        idTimeMobile: 'Dhuhr',
        idTimeDesktop: 'Dhuhr_wide',
        adhanDurationMinutes: 2,
        iqamaDurationMinutes: 10,
    },
    {
        name: 'Asr',
        idMobileRow: 'rowAsr',
        idTimeMobile: 'Asr',
        idTimeDesktop: 'Asr_wide',
        adhanDurationMinutes: 2,
        iqamaDurationMinutes: 10,
    },
    {
        name: 'Maghrib',
        idMobileRow: 'rowMaghrib',
        idTimeMobile: 'Maghrib',
        idTimeDesktop: 'Maghrib_wide',
        adhanDurationMinutes: 2,
        iqamaDurationMinutes: 5,
    },
    {
        name: 'Isha',
        displayName: 'Ishaa',
        idMobileRow: 'rowIshaa',
        idTimeMobile: 'Isha',
        idTimeDesktop: 'Isha_wide',
        adhanDurationMinutes: 2,
        iqamaDurationMinutes: 10,
    },
];

export const jumaaConfig = {
    name: 'Jumaa',
    idMobileCol: 'colJumaaMobile',
    idTimeMobile: 'Jumaa',
    idDesktopCard: 'jumaaCardDesktopSide',
    idTimeDesktopSide: 'Jumaa_desktop_side',
    adhanDurationMinutes: 2,
    iqamaDurationMinutes: 10,
};

export const sunriseConfig = {
    name: 'Sunrise',
    displayName: 'Shuruk',
    idMobileCol: 'colShurukMobile',
    idTimeMobile: 'Sunrise', // Zeit-Element-ID für Mobile
    idTitleMobile: 'shurukTitleMobile', // NEU: ID für den Titel-Span Mobile
    idTimeDesktopSide: 'Sunrise_desktop_side', // Zeit-Element-ID für Desktop
    idTitleDesktopSide: 'shurukTitleDesktopSide', // NEU: ID für den Titel-Span Desktop
    // Desktop-Highlighting: Shuruk hat keine eigene Karte wie Jumaa,
    // sondern ist Teil einer Sammelkarte oder einer einfachen Anzeige.
    // Das Highlighten von Shuruk/Eid auf dem Desktop muss ggf. anders behandelt werden
    // als die Hauptgebete oder Jumaa, falls es eine eigene "Karte" bekommen soll.
    // Aktuell wird es wie ein normales Gebet behandelt, wenn es hervorgehoben wird.
    // Wenn es eine spezielle Desktop-Karte für Shuruk/Eid gibt, die hervorgehoben werden soll,
    // müsste hier eine idDesktopCard o.ä. definiert werden.
    // Für den Moment gehen wir davon aus, dass die Hervorhebung über die Zeit-Elemente gesteuert wird.
    adhanDurationMinutes: 0, // Standard für Shuruk
    iqamaDurationMinutes: 0, // Standard für Shuruk
};

export const eidPrayerConfig = {
    showEidPrayer: false, // Auf true setzen, um Eid-Gebet anzuzeigen
    name: 'Eid', // Interner Name
    displayName: 'Eid Gebet',
    dayOfEid: '2025-06-06', // Beispiel: YYYY-MM-DD Format. Passe dies an.
    timeOfEid: '06:30', // Beispiel: HH:MM Format
    adhanDurationMinutes: 2,
    iqamaDurationMinutes: 10,
    // UI-Element-IDs für Titel (werden von sunriseConfig "geliehen" bzw. sind neu)
    idTitleMobile: sunriseConfig.idTitleMobile,
    idTitleDesktopSide: sunriseConfig.idTitleDesktopSide,
    // UI-Element-IDs für Zeit (werden von sunriseConfig "geliehen")
    idTimeMobile: sunriseConfig.idTimeMobile,
    idTimeDesktopSide: sunriseConfig.idTimeDesktopSide,
    // UI-Element-ID für die Spalte/den Container (wird von sunriseConfig "geliehen")
    idMobileCol: sunriseConfig.idMobileCol,
    // Wenn Eid auf dem Desktop eine eigene Karte wie Jumaa hätte, bräuchte es:
    // idDesktopCard: 'eidCardDesktop', (hypothetisch)
};

export const highlightClassNameMobile = 'custom-row-bg';
export const highlightClassNameDesktop = 'custom-col';

// API Konfiguration (für HIJRI_MODE = 'api')
export const latitude = 49.0034; // Beispiel: Regensburg
export const longitude = 12.1213; // Beispiel: Regensburg
export const calculationMethod = 99; // Für Custom Settings
export const methodSettingsParam = '12.55,,12.65'; // Beispiel: Fajr 12.55°, Isha 12.65°
export const tuneOffsets = '0,0,0,5,0,3,0,0,0'; // Beispiel: Maghrib +5 Min, Isha +3 Min

// Übersetzung der englischen Monats-Schlüssel zu deutschen Namen
export const hijriMonthMap = {
    Muharram: 'Muharram',
    Safar: 'Safar',
    "Rabī' al-awwal": "Rabīʿ al-awwal",
    "Rabī' al-thānī": "Rabīʿ al-thānī",
    "Jumādā al-ūlā": "Dschumādā l-ūlā",
    "Jumādā al-ākhirah": 'Dschumādā l-āchira',
    Rajab: 'Radschab',
    "Sha'bān": "Schaʿbān",
    Ramadān: 'Ramadān',
    Shawwāl: 'Schauwāl',
    "Dhū al-Qa'dah": "Dhū l-Qaʿda",
    "Dhū al-Ḥijjah": "Dhū l-Hiddscha",
};

// Feste Reihenfolge der Monats-Schlüssel für die Zählung im manuellen Modus
export const hijriMonthOrder = [
    'Muharram', 'Safar', "Rabī' al-awwal", "Rabī' al-thānī",
    "Jumādā al-ūlā", "Jumādā al-ākhirah", 'Rajab', "Sha'bān",
    'Ramadān', 'Shawwāl', "Dhū al-Qa'dah", "Dhū al-Ḥijjah"
];

// --- MODUS-EINSTELLUNG FÜR HIJRI-DATUM ---
// 'api': Verwendet die Aladhan API für das Hijri-Datum.
// 'manual': Verwendet die untenstehenden MANUAL_SETTINGS 
export const HIJRI_MODE = 'manual'; // ÄNDERE DIES ZU 'api' oder 'manual'

// --- EINSTELLUNGEN FÜR MANUAL_MODE ---
// Diese Werte werden verwendet, wenn HIJRI_MODE = 'manual' ist.
// Passe diese an, um den Startpunkt für die manuelle Zählung festzulegen.
export const MANUAL_SETTINGS = {
    // Der islamische Tag, der am Abend des START_GREGORIAN_DATE_STR beginnt.
    START_HIJRI_DAY: 1,
    // Der englische Schlüssel des Monats (muss in hijriMonthOrder und hijriMonthMap existieren).
    START_HIJRI_MONTH_KEY: "Muharram",
    // Das islamische Jahr.
    START_HIJRI_YEAR: 1447,
    // Das gregorianische Datum (Format YYYY-MM-DD), an dessen Abend (nach Maghrib)
    // der oben definierte START_HIJRI_DAY beginnt.
    // Beispiel: Wenn der 1. Ramadan am Abend des 27. Februar beginnt,
    // dann ist START_GREGORIAN_DATE_STR = "2025-02-27".
    START_GREGORIAN_DATE_STR: "2025-06-26",
};
