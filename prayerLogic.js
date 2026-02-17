// prayerLogic.js
import {
    prayerTimesConfig,
    jumaaConfig,
    sunriseConfig, // Wird für Eid-UI-Struktur und Shuruk-Anzeige in ui.js benötigt
    eidPrayerConfig,
} from './config.js';
import {
    parsePrayerTime,
    getAdhanEndTime,
    getIqamaEndTime,
} from './timeUtils.js';
import { initialDataLoaded, prayerTimesData } from './state.js';

/**
 * Erstellt eine Liste der Gebetskonfigurationen, die für die *Berechnung* des nächsten
 * und hervorzuhebenden Gebets relevant sind.
 * Eid wird nur am tatsächlichen Tag des Eid-Gebets in diese Logik-Liste aufgenommen.
 * Shuruk wird für diese Logik-Berechnungen komplett ignoriert.
 * @param {Date} now - Das aktuelle Datum und die aktuelle Uhrzeit.
 * @param {object} currentPrayerTimes - Die aktuell geladenen Gebetszeiten.
 * @returns {Array<object>} Eine Liste von effektiven Gebetskonfigurationsobjekten für die Logik.
 */
function getEffectivePrayerConfigs(now, currentPrayerTimes) {
    if (!currentPrayerTimes) {
        console.warn("Logic: getEffectivePrayerConfigs - currentPrayerTimes nicht verfügbar");
        return [];
    }

    const effectiveConfigs = [];
    const isFriday = now.getDay() === 5;
    const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Hauptgebete
    prayerTimesConfig.forEach((config) => {
        if (isFriday && config.name === 'Dhuhr' && currentPrayerTimes.Jumaa) {
            return; // Dhuhr wird durch Jumaa ersetzt
        }
        if (currentPrayerTimes[config.name]) {
            effectiveConfigs.push({
                ...config,
                time: currentPrayerTimes[config.name],
            });
        } else {
            console.warn(`Logic: Fehlende Zeit für ${config.name} in currentPrayerTimes`);
        }
    });

    // Jumaa
    if (isFriday && currentPrayerTimes.Jumaa) {
        effectiveConfigs.push({
            ...jumaaConfig,
            time: currentPrayerTimes.Jumaa,
        });
    }

    // Eid wird für die Logik nur berücksichtigt, wenn es der heutige Tag ist
    // UND showEidPrayer (als genereller Schalter) an ist.
    // Shuruk wird für die Logik hier komplett ignoriert.
    if (eidPrayerConfig.showEidPrayer && eidPrayerConfig.dayOfEid === todayDateString) {
        effectiveConfigs.push({
            ...sunriseConfig, // Basis für UI-Element-IDs, die Eid "ausleiht"
            name: eidPrayerConfig.name,
            displayName: eidPrayerConfig.displayName,
            time: eidPrayerConfig.timeOfEid,
            adhanDurationMinutes: eidPrayerConfig.adhanDurationMinutes,
            iqamaDurationMinutes: eidPrayerConfig.iqamaDurationMinutes,
            isEidActive: true, // Wichtiges Flag für die Logik
        });
    } else {
        // In allen anderen Fällen (nicht Eid-Tag oder showEidPrayer ist false für Eid)
        // wird Shuruk NICHT zu den `effectiveConfigs` für die Gebetslogik hinzugefügt.
        // Die Anzeige von Shuruk-Zeit und -Titel in der UI erfolgt separat in `updatePrayerTimesUI`.
    }
    return effectiveConfigs; // Diese Liste enthält jetzt KEIN Shuruk mehr, nur potenziell Eid.
}

function buildPrayerList(now) {
    if (!initialDataLoaded || !prayerTimesData) return null;

    const prayers = [];
    const configs = getEffectivePrayerConfigs(now, prayerTimesData);

    configs.forEach((config) => {
        if (config.time && config.time !== '--:--') {
            const prayerDate = parsePrayerTime(config.time, now);
            if (prayerDate) {
                const adhanEnd = getAdhanEndTime(config, prayerDate);
                const iqamaEnd = getIqamaEndTime(config, adhanEnd);
                prayers.push({
                    ...config,
                    date: prayerDate,
                    adhanEndTime: adhanEnd,
                    iqamaEndTime: iqamaEnd,
                });
            }
        }
    });

    prayers.sort((a, b) => a.date - b.date);
    return prayers;
}

function findFajrTomorrow(now) {
    const fajrConfig = prayerTimesConfig.find(p => p.name === 'Fajr');
    if (!fajrConfig || !prayerTimesData[fajrConfig.name]) return null;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const fajrTime = prayerTimesData[fajrConfig.name];
    const fajrDate = parsePrayerTime(fajrTime, tomorrow);
    if (!fajrDate) return null;

    const adhanEnd = getAdhanEndTime(fajrConfig, fajrDate);
    const iqamaEnd = getIqamaEndTime(fajrConfig, adhanEnd);
    return { ...fajrConfig, date: fajrDate, adhanEndTime: adhanEnd, iqamaEndTime: iqamaEnd, time: fajrTime };
}

export function findPrayerToHighlight(now) {
    const prayers = buildPrayerList(now);
    if (!prayers) return null;

    // Aktives Gebet (zwischen Start und Iqama-Ende)?
    for (const prayer of prayers) {
        if (now >= prayer.date && now < prayer.iqamaEndTime) {
            return { ...prayer, isAdhanTime: now < prayer.adhanEndTime };
        }
    }

    // Nächstes bevorstehendes Gebet?
    for (const prayer of prayers) {
        if (prayer.date > now) return { ...prayer, isAdhanTime: false };
    }

    // Alle vorbei → Fajr morgen
    if (prayers.length > 0) {
        const fajr = findFajrTomorrow(now);
        if (fajr) return { ...fajr, isAdhanTime: false };
    }
    return null;
}

export function findNextPrayer(now) {
    const prayers = buildPrayerList(now);
    if (!prayers) return null;

    // Aktives Gebet?
    for (const prayer of prayers) {
        if (now >= prayer.date && now < prayer.iqamaEndTime) return { ...prayer };
    }

    // Nächstes bevorstehendes?
    for (const prayer of prayers) {
        if (prayer.date > now) return prayer;
    }

    // Alle vorbei → Fajr morgen
    if (prayers.length > 0) return findFajrTomorrow(now);
    return null;
}
