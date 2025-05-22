// config.js
// Enthält globale Konfigurationen, Konstanten und CSS-Klassennamen.

export const prayerTimesConfig = [
    {
        name: 'Fajr',
        idMobileRow: 'rowFajr',
        idTimeMobile: 'Fajr',
        idTimeDesktop: 'Fajr_wide', // Für Haupt-Desktop-Block
        adhanDurationMinutes: 2,
        iqamaDurationMinutes: 10,
    },
    {
        name: 'Dhuhr',
        idMobileRow: 'rowDhuhr',
        idTimeMobile: 'Dhuhr',
        idTimeDesktop: 'Dhuhr_wide', // Für Haupt-Desktop-Block
        adhanDurationMinutes: 2,
        iqamaDurationMinutes: 10,
    },
    {
        name: 'Asr',
        idMobileRow: 'rowAsr',
        idTimeMobile: 'Asr',
        idTimeDesktop: 'Asr_wide', // Für Haupt-Desktop-Block
        adhanDurationMinutes: 2,
        iqamaDurationMinutes: 10,
    },
    {
        name: 'Maghrib',
        idMobileRow: 'rowMaghrib',
        idTimeMobile: 'Maghrib',
        idTimeDesktop: 'Maghrib_wide', // Für Haupt-Desktop-Block
        adhanDurationMinutes: 2,
        iqamaDurationMinutes: 5,
    },
    {
        name: 'Isha', // Name in prayerLogic.js ist 'Isha'
        displayName: 'Ishaa', // Angezeigter Name, falls abweichend
        idMobileRow: 'rowIshaa',
        idTimeMobile: 'Isha', // ID des Zeit-Elements
        idTimeDesktop: 'Isha_wide', // Für Haupt-Desktop-Block
        adhanDurationMinutes: 2,
        iqamaDurationMinutes: 10,
    },
];

export const jumaaConfig = {
    name: 'Jumaa',
    // Mobile IDs
    idMobileRow: null, // Jumaa hat im Mobile-Layout oft eine eigene Spalte, keine ganze Zeile
    idMobileCol: 'colJumaaMobile', // ID der Spalte für Jumaa im Mobile-Layout
    idTimeMobile: 'Jumaa', // ID des Zeit-Elements in der mobilen Ansicht

    // Desktop IDs
    // idTimeDesktop: 'Jumaa_wide', // Alte ID für Zeit im unteren Jumaa/Shuruk Block
    // idDesktopContainer: 'jumaaContainerDesktop', // Alte ID des Containers im unteren Block

    // NEU: Für die seitliche Desktop-Card
    idDesktopCard: 'jumaaCardDesktopSide', // ID der gesamten seitlichen Jumaa-Card für Highlighting
    idTimeDesktopSide: 'Jumaa_desktop_side', // ID des Zeit-Elements in der seitlichen Card (für Befüllung durch ui.js)

    adhanDurationMinutes: 2,
    iqamaDurationMinutes: 10,
};

export const sunriseConfig = {
    name: 'Sunrise',
    displayName: 'Shuruk', // Angezeigter Name
    // Mobile IDs
    idMobileRow: null,
    idMobileCol: 'colShurukMobile',
    idTimeMobile: 'Sunrise',

    // Desktop IDs
    // idTimeDesktop: 'Sunrise_wide', // Alt
    // idDesktopContainer: 'shurukContainerDesktop', // Alt

    // NEU: Für die seitliche Desktop-Card
    idDesktopCard: null, // Hier könntest du 'shurukCardDesktopSide' eintragen, falls Shuruk hervorgehoben werden soll
    idTimeDesktopSide: 'Sunrise_desktop_side',

    adhanDurationMinutes: 0,
    iqamaDurationMinutes: 0,
};

export const highlightClassNameMobile = 'custom-row-bg';
export const highlightClassNameDesktop = 'custom-col'; // Diese Klasse wird für das Desktop-Highlighting verwendet

// API Konfiguration
export const latitude = 49.0034;
export const longitude = 12.1213;
export const calculationMethod = 99;
export const methodSettingsParam = '12.55,,12.65';
export const tuneOffsets = '0,0,0,5,0,3,0,0,0';

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
