// ui.js
// Verantwortlich für die Aktualisierung der Benutzeroberfläche (DOM-Manipulation).

import {
    prayerTimesConfig,
    jumaaConfig,
    sunriseConfig,
    highlightClassNameMobile,
    highlightClassNameDesktop,
    hijriMonthMap,
} from './config.js';
import { getCurrentTime } from './timeUtils.js';
import { findPrayerToHighlight, findNextPrayer } from './prayerLogic.js';
import {
    elements,
    initialDataLoaded, // Importiere initialDataLoaded zum Prüfen
    prayerTimesData, // Zum Lesen importieren
    displayedIslamicDate,
    lastHighlightUpdateMinute, // Zum Lesen importieren
    setLastHighlightMinute, // Korrekten Setter importieren
    setDisplayedIslamicDate,
    setPrayerTimesData, // Setter für Gebetszeiten importieren
} from './main.js';

/**
 * Aktualisiert die Anzeige der Gebetszeiten in der UI.
 * @param {object} times - Das Objekt mit den Gebetszeiten.
 */
export function updatePrayerTimesUI(times) {
    const allConfigs = [...prayerTimesConfig, sunriseConfig, jumaaConfig];

    allConfigs.forEach((config) => {
        let timeValue;
        if (config.name === 'Jumaa') {
            timeValue = prayerTimesData['Jumaa'] || '--:--';
        } else {
            timeValue = times[config.name]
                ? times[config.name].substring(0, 5)
                : '--:--';
        }

        const timeElementMobile = document.getElementById(config.idTimeMobile);
        if (timeElementMobile) timeElementMobile.textContent = timeValue;

        const timeElementDesktop = document.getElementById(config.idTimeDesktop);
        if (timeElementDesktop) timeElementDesktop.textContent = timeValue;
    });
}

/**
 * Zeigt eine Fehlermeldung in der UI an.
 * @param {string} message - Die anzuzeigende Fehlermeldung.
 */
export function displayError(message) {
    if (elements.nextPrayer) {
        elements.nextPrayer.textContent = message;
        elements.nextPrayer.style.color = 'orange';
    }
    if (elements.nextPrayerIcon) {
        elements.nextPrayerIcon.style.display = 'none';
    }
}

/**
 * Aktualisiert die Hervorhebung der aktuellen Gebetszeit in der UI.
 * Fügt die blink-bg Klasse korrekt für Reihen und Spalten hinzu/entfernt sie.
 * @param {object|null} prayerToHighlight - Das hervorzuhebende Gebet oder null.
 * @param {Date} now - Die aktuelle Zeit.
 */
export function highlightPrayer(prayerToHighlight, now) {
    if (!initialDataLoaded) return; // Nur ausführen, wenn Daten geladen sind

    const allHighlightableConfigs = [...prayerTimesConfig, jumaaConfig];

    // 1. Alle Hervorhebungen und Blinkeffekte entfernen
    allHighlightableConfigs.forEach((config) => {
        // Mobile Row
        const mobileRowElement = document.getElementById(config.idMobileRow);
        if (mobileRowElement) {
            mobileRowElement.classList.remove(
                highlightClassNameMobile,
                'blink-bg' // Blink von Reihe entfernen
            );
        }
        // Mobile Col (Parent und Inner)
        const mobileColElement = document.getElementById(config.idMobileCol);
        if (mobileColElement) {
             // Blink-Klasse vom Elternelement (col-6) entfernen
             mobileColElement.classList.remove('blink-bg');
             const innerContainer = mobileColElement.querySelector('.d-flex.flex-column');
             if (innerContainer) {
                 // Highlight-Klasse vom inneren entfernen
                 innerContainer.classList.remove('custom-col-mobile');
             }
        }
        // Desktop Element
        let desktopHighlightTarget = null;
        if (config.idDesktopContainer) {
            desktopHighlightTarget = document.getElementById(config.idDesktopContainer);
        } else if (config.idTimeDesktop) {
            const timeElementDesktop = document.getElementById(config.idTimeDesktop);
            if (timeElementDesktop) {
                desktopHighlightTarget = timeElementDesktop.closest('.d-flex.flex-column');
            }
        }
        if (desktopHighlightTarget) {
            // Blink-Klasse auch vom Desktop-Element entfernen
            desktopHighlightTarget.classList.remove(highlightClassNameDesktop, 'blink-bg');
        }
    });

    // 2. Neue Hervorhebung setzen, falls nötig
    if (prayerToHighlight) {
        const isAdhanTime =
            prayerToHighlight.date &&
            prayerToHighlight.endDate &&
            now >= prayerToHighlight.date &&
            now < prayerToHighlight.endDate;

        // Mobile Row
        const nextMobileRowElement = document.getElementById(prayerToHighlight.idMobileRow);
        if (nextMobileRowElement) {
            nextMobileRowElement.classList.add(highlightClassNameMobile);
            if (isAdhanTime) {
                // Blink-Klasse zur Reihe hinzufügen
                nextMobileRowElement.classList.add('blink-bg');
            }
        }

        // Mobile Col (Jumaa/Shuruk)
        const nextMobileColElement = document.getElementById(prayerToHighlight.idMobileCol);
        if (nextMobileColElement) {
            // Highlight-Klasse zum inneren Container hinzufügen (für Textfarbe etc.)
            const innerContainer = nextMobileColElement.querySelector('.d-flex.flex-column');
            if (innerContainer) {
                innerContainer.classList.add('custom-col-mobile');
            }
            // Blink-Klasse zum Elternelement (col-6) hinzufügen
            if (isAdhanTime) {
                nextMobileColElement.classList.add('blink-bg');
            }
        }

        // Desktop Element
        let nextDesktopHighlightTarget = null;
        if (prayerToHighlight.idDesktopContainer) {
            nextDesktopHighlightTarget = document.getElementById(prayerToHighlight.idDesktopContainer);
        } else if (prayerToHighlight.idTimeDesktop) {
            const nextTimeElementDesktop = document.getElementById(prayerToHighlight.idTimeDesktop);
            if (nextTimeElementDesktop) {
                nextDesktopHighlightTarget = nextTimeElementDesktop.closest('.d-flex.flex-column');
            }
        }
        if (nextDesktopHighlightTarget) {
            nextDesktopHighlightTarget.classList.add(highlightClassNameDesktop);
            if (isAdhanTime) {
                // Blink-Klasse zum Desktop-Element hinzufügen
                nextDesktopHighlightTarget.classList.add('blink-bg');
            }
        }
    }
}


/**
 * Aktualisiert die Anzeige des Countdowns zur nächsten Gebetszeit oder Adhan-Status.
 * @param {object|null} prayerToHighlight - Das aktuell hervorgehobene Gebet.
 * @param {object|null} chronologicallyNextPrayer - Das chronologisch nächste Gebet.
 * @param {Date} now - Die aktuelle Zeit.
 */
export function updateNextPrayerTimerDisplay(
    prayerToHighlight,
    chronologicallyNextPrayer,
    now
) {
    // Funktion bleibt unverändert zur vorherigen korrekten Version
    if (!elements.nextPrayer) return;
    const iconElement = elements.nextPrayerIcon;

    if (!initialDataLoaded) {
        elements.nextPrayer.textContent = 'Lade...'; // Konsistenter Ladezustand
        if (iconElement) iconElement.style.display = 'none';
        return;
    }

    // Fall 1: Adhan-Zeit des aktuell hervorgehobenen Gebets
    if (
        prayerToHighlight &&
        prayerToHighlight.date &&
        prayerToHighlight.endDate &&
        now >= prayerToHighlight.date &&
        now < prayerToHighlight.endDate
    ) {
        elements.nextPrayer.textContent = `Adhan`;
        const adhanColor = '#90EE90'; // Helles Grün
        elements.nextPrayer.style.color = adhanColor;
        if (iconElement) {
            iconElement.style.display = '';
            iconElement.style.fill = adhanColor;
        }
    }
    // Fall 2: Countdown zum nächsten Gebet
    else if (chronologicallyNextPrayer && chronologicallyNextPrayer.date) {
        const timeDiff = chronologicallyNextPrayer.date.getTime() - now.getTime();

        if (timeDiff > 0) {
            let timeLeftString = '';
            const totalMinutesLeft = Math.floor(timeDiff / (1000 * 60));

            if (totalMinutesLeft < 1) { // Weniger als eine Minute -> Sekunden anzeigen
                const secondsLeft = Math.ceil(timeDiff / 1000);
                timeLeftString = `${secondsLeft} Sek`;
            } else { // Sonst Stunden und Minuten
                const hoursLeft = Math.floor(totalMinutesLeft / 60);
                const minutesLeft = totalMinutesLeft % 60;
                if (hoursLeft > 0) {
                    timeLeftString += `${hoursLeft} Std `;
                }
                timeLeftString += `${minutesLeft} Min`;
            }

            const nextPrayerNameDisplay =
                chronologicallyNextPrayer.name.charAt(0).toUpperCase() +
                chronologicallyNextPrayer.name.slice(1);
            elements.nextPrayer.textContent = `${nextPrayerNameDisplay} in ${timeLeftString}`;
            elements.nextPrayer.style.color = 'white'; // Standardfarbe
            if (iconElement) {
                iconElement.style.display = '';
                iconElement.style.fill = 'currentColor'; // Standardfarbe
            }
        } else {
            // Sollte selten vorkommen, Fallback
            elements.nextPrayer.textContent = 'Warte...'; // Konsistenter Wartezustand
            elements.nextPrayer.style.color = 'grey';
            if (iconElement) {
                iconElement.style.display = 'none';
                iconElement.style.fill = 'currentColor';
            }
        }
    }
    // Fall 3: Fallback, wenn keine Gebetsdaten verfügbar oder Fehler
    else {
        elements.nextPrayer.textContent = 'Warte...'; // Konsistenter Wartezustand
        elements.nextPrayer.style.color = 'grey';
        if (iconElement) {
            iconElement.style.display = 'none';
            iconElement.style.fill = 'currentColor';
        }
    }
}

/**
 * Aktualisiert die Anzeige der Uhrzeit und des gregorianischen Datums.
 */
export function updateDateTimeDisplay() {
    // Funktion bleibt unverändert zur vorherigen korrekten Version
    const now = getCurrentTime();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const secondsValue = now.getSeconds().toString().padStart(2, '0');
    if (elements.hoursAndMin) elements.hoursAndMin.textContent = `${hours}:${minutes}`;
    if (elements.seconds) elements.seconds.textContent = `:${secondsValue}`;
    if (elements.currentDate) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        elements.currentDate.textContent = now.toLocaleDateString('de-DE', options);
    }
}

/**
 * Aktualisiert die Anzeige des islamischen Datums.
 * @param {object|null} hijriData - Die abgerufenen Hijri-Daten oder null.
 */
export function updateIslamicDateUI(hijriData) {
    // Funktion bleibt unverändert zur vorherigen korrekten Version
    if (hijriData) {
        const islamicDay = hijriData.day;
        const islamicMonth = hijriMonthMap[hijriData.month.en] || hijriData.month.en;
        const islamicYear = hijriData.year;
        const islamicDateStr = `${islamicDay}. ${islamicMonth} ${islamicYear} H`;
        setDisplayedIslamicDate(islamicDateStr);
        if (elements.islamicDate) elements.islamicDate.textContent = islamicDateStr;
        console.log('Islamisches Datum UI aktualisiert:', islamicDateStr);
    } else {
        console.warn('Keine gültigen Hijri-Daten zum Aktualisieren des islamischen Datums UI.');
        if (elements.islamicDate) elements.islamicDate.textContent = 'Islamisches Datum nicht verfügbar.';
    }
}

/**
 * Setzt die Isha-Zeit manuell und aktualisiert die UI.
 * @param {string} timeStr - Die neue Isha-Zeit (HH:MM).
 */
export function setIshaTimeUI(timeStr) {
    // Funktion bleibt unverändert zur vorherigen korrekten Version
    const cleanTime = timeStr.substring(0, 5);
    const updatedTimes = { ...prayerTimesData, Isha: cleanTime };
    setPrayerTimesData(updatedTimes);
    const ishaMobile = document.getElementById('Isha');
    if (ishaMobile) ishaMobile.textContent = cleanTime;
    const ishaWide = document.getElementById('Isha_wide');
    if (ishaWide) ishaWide.textContent = cleanTime;
    console.log('Isha manuell gesetzt auf:', cleanTime);
    if (initialDataLoaded) {
        const now = getCurrentTime();
        const prayerToHighlight = findPrayerToHighlight(now);
        const chronologicallyNextPrayer = findNextPrayer(now);
        highlightPrayer(prayerToHighlight, now);
        updateNextPrayerTimerDisplay(prayerToHighlight, chronologicallyNextPrayer, now);
    }
}

/**
 * Setzt die Jumaa-Zeit manuell und aktualisiert die UI.
 * @param {string} timeStr - Die neue Jumaa-Zeit (HH:MM).
 */
export function setJumaaTimeUI(timeStr) {
    // Funktion bleibt unverändert zur vorherigen korrekten Version
    const cleanTime = timeStr.substring(0, 5);
    const updatedTimes = { ...prayerTimesData, Jumaa: cleanTime };
    setPrayerTimesData(updatedTimes);
    const jumaaMobile = document.getElementById('Jumaa');
    if (jumaaMobile) jumaaMobile.textContent = cleanTime;
    const jumaaWide = document.getElementById('Jumaa_wide');
    if (jumaaWide) jumaaWide.textContent = cleanTime;
    console.log('Jumaa manuell gesetzt auf:', cleanTime);
    if (initialDataLoaded) {
        const now = getCurrentTime();
        const prayerToHighlight = findPrayerToHighlight(now);
        const chronologicallyNextPrayer = findNextPrayer(now);
        highlightPrayer(prayerToHighlight, now);
        updateNextPrayerTimerDisplay(prayerToHighlight, chronologicallyNextPrayer, now);
    }
}

/**
 * Aktualisiert Highlight und Countdown (wird nur aufgerufen, wenn initialDataLoaded true ist).
 */
export function updateUI() {
    // Funktion bleibt unverändert zur vorherigen korrekten Version
    const now = getCurrentTime();
    const prayerToHighlight = findPrayerToHighlight(now);
    const chronologicallyNextPrayer = findNextPrayer(now);
    const currentMinute = now.getMinutes();
    if (currentMinute !== lastHighlightUpdateMinute || lastHighlightUpdateMinute === -1) {
        highlightPrayer(prayerToHighlight, now);
        setLastHighlightMinute(currentMinute);
    }
    updateNextPrayerTimerDisplay(prayerToHighlight, chronologicallyNextPrayer, now);
}
