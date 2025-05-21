// config.js
// Enthält globale Konfigurationen, Konstanten und CSS-Klassennamen.

export const prayerTimesConfig = [
    {
        name: 'Fajr',
        idMobileRow: 'rowFajr',
        idTimeMobile: 'Fajr',
        idTimeDesktop: 'Fajr_wide',
        adhanDurationMinutes: 2,
    },
    {
        name: 'Dhuhr',
        idMobileRow: 'rowDhuhr',
        idTimeMobile: 'Dhuhr',
        idTimeDesktop: 'Dhuhr_wide',
        adhanDurationMinutes: 2,
    },
    {
        name: 'Asr',
        idMobileRow: 'rowAsr',
        idTimeMobile: 'Asr',
        idTimeDesktop: 'Asr_wide',
        adhanDurationMinutes: 2,
    },
    {
        name: 'Maghrib',
        idMobileRow: 'rowMaghrib',
        idTimeMobile: 'Maghrib',
        idTimeDesktop: 'Maghrib_wide',
        adhanDurationMinutes: 2,
    },
    {
        name: 'Isha',
        idMobileRow: 'rowIshaa',
        idTimeMobile: 'Isha',
        idTimeDesktop: 'Isha_wide',
        adhanDurationMinutes: 2,
    },
];

export const jumaaConfig = {
    name: 'Jumaa',
    idMobileRow: 'rowJumaa',
    idTimeMobile: 'Jumaa',
    idTimeDesktop: 'Jumaa_wide',
    idDesktopContainer: 'jumaaContainerDesktop',
    idMobileCol: 'colJumaaMobile',
    adhanDurationMinutes: 2, // Einheitlich auf 2 Minuten geändert
};

export const sunriseConfig = {
    name: 'Sunrise',
    idMobileRow: 'rowShuruk',
    idTimeMobile: 'Sunrise',
    idTimeDesktop: 'Sunrise_wide',
    idDesktopContainer: 'shurukContainerDesktop',
    idMobileCol: 'colShurukMobile',
    adhanDurationMinutes: 0, // Keine Adhan-Verzögerung
};

export const highlightClassNameMobile = 'custom-row-bg';
export const highlightClassNameDesktop = 'custom-col';

// API Konfiguration
export const latitude = 49.0034;
export const longitude = 12.1213;
export const calculationMethod = 99; // Custom Methode aktivieren
export const methodSettingsParam = '12.55,,12.65';
// 12.5,,12.7
// Optional: Zeitverschiebungen (tune) in Minuten für jedes Gebet
// Format: Fajr,Sunrise,Dhuhr,Asr,Sunset,Maghrib,Isha,Imsak,Midnight
export const tuneOffsets = '0,0,0,5,0,3,0,0,0'; // Dhuhr um 5 Min und Maghrib um 3 Min verschieben


// Monatsübersetzungen für das islamische Datum
export const hijriMonthMap = {
    Muharram: 'Muharram',
    Safar: 'Safar',
    "Rabī' al-awwal": "Rabīʿ al-awwal",
    "Rabī' al-thānī": "Rabīʿ al-thānī",
    "Jumādā al-ūlā": "Dschumādā l-ūlā",
    "Jumādā al-ākhirah": 'Dschumādā l-āchira', // Korrigiert
    Rajab: 'Radschab',
    "Sha'bān": "Schaʿbān",
    Ramadān: 'Ramadān',
    Shawwāl: 'Schauwāl',
    "Dhū al-Qa'dah": "Dhū l-Qaʿda",
    "Dhū al-Ḥijjah": "Dhū l-Hiddscha",
};
