// api.js
// Verantwortlich für die Kommunikation mit der Aladhan API zum Abrufen von Gebetszeiten und islamischem Datum.
// Enthält ZSTD-Dekomprimierung für Browser die es nicht nativ unterstützen.

import { getCurrentTime } from './timeUtils.js';
import {
    methodSettingsParam,
    tuneOffsets,
} from './config.js';

// Konstante für API-Retry bei Problemen
const MAX_API_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Formatiert ein Date-Objekt in das von der Aladhan API erwartete DD-MM-YYYY Format.
 * @param {Date} date - Das zu formatierende Datum.
 * @returns {string} Das formatierte Datum als String.
 */
function formatDateForApi(date) {
    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
}

// ZSTD Magic Bytes: 28 B5 2F FD
const ZSTD_MAGIC = [0x28, 0xB5, 0x2F, 0xFD];

// Lade fzstd Library dynamisch wenn benötigt
let fzstdModule = null;
async function loadFzstd() {
    if (fzstdModule) return fzstdModule;
    try {
        // Verwende fzstd von esm.sh CDN
        fzstdModule = await import('https://esm.sh/fzstd@0.1.1');
        return fzstdModule;
    } catch (error) {
        console.warn('ZSTD-Bibliothek konnte nicht geladen werden:', error);
        return null;
    }
}

/**
 * Prüft ob die Daten ZSTD-komprimiert sind
 */
function isZstdCompressed(bytes) {
    if (bytes.length < 4) return false;
    return bytes[0] === ZSTD_MAGIC[0] &&
        bytes[1] === ZSTD_MAGIC[1] &&
        bytes[2] === ZSTD_MAGIC[2] &&
        bytes[3] === ZSTD_MAGIC[3];
}

/**
 * Prüft ob die Daten gzip-komprimiert sind
 */
function isGzipCompressed(bytes) {
    if (bytes.length < 2) return false;
    return bytes[0] === 0x1F && bytes[1] === 0x8B;
}

/**
 * Dekomprimiert ZSTD-Daten
 */
async function decompressZstd(data) {
    const fzstd = await loadFzstd();
    if (!fzstd) {
        throw new Error('ZSTD-Dekomprimierung nicht verfügbar');
    }
    return fzstd.decompress(data);
}

/**
 * Dekomprimiert gzip-Daten mit DecompressionStream
 */
async function decompressGzip(buffer) {
    if (typeof DecompressionStream === 'undefined') {
        throw new Error('DecompressionStream nicht verfügbar');
    }

    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(new Uint8Array(buffer));
    writer.close();

    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
}

/**
 * Verarbeitet die API-Antwort und dekomprimiert wenn nötig
 */
async function processResponse(buffer) {
    const bytes = new Uint8Array(buffer);

    if (bytes.length === 0) {
        throw new Error('Leere API-Antwort erhalten.');
    }

    let resultBytes = bytes;

    // Prüfe auf ZSTD-Komprimierung
    if (isZstdCompressed(bytes)) {
        try {
            resultBytes = await decompressZstd(bytes);
        } catch (error) {
            console.error('ZSTD-Dekomprimierung fehlgeschlagen:', error);
            throw new Error('ZSTD-Dekomprimierung fehlgeschlagen. Bitte versuchen Sie es später erneut.');
        }
    }
    // Prüfe auf gzip-Komprimierung
    else if (isGzipCompressed(bytes)) {
        try {
            resultBytes = await decompressGzip(buffer);
        } catch (error) {
            console.error('Gzip-Dekomprimierung fehlgeschlagen:', error);
            throw new Error('Gzip-Dekomprimierung fehlgeschlagen.');
        }
    }

    // Zu Text dekodieren
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(resultBytes);

    if (!text || text.trim() === '') {
        throw new Error('Leere Antwort nach Dekomprimierung.');
    }

    // Prüfe ob es gültiges JSON ist
    const firstChar = text.trim()[0];
    if (firstChar !== '{' && firstChar !== '[') {
        console.warn('Antwort beginnt nicht mit JSON. Erste 100 Zeichen:', text.substring(0, 100));
        throw new Error('Ungültige API-Antwort erhalten.');
    }

    return JSON.parse(text);
}

/**
 * Hilfsfunktion für fetch mit automatischer Dekomprimierung und Retry.
 */
async function fetchWithDecompression(url, attempt = 1) {
    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        // Lese als ArrayBuffer um Rohdaten zu bekommen
        const buffer = await response.arrayBuffer();

        try {
            return await processResponse(buffer);
        } catch (processError) {
            console.warn(`Verarbeitungsfehler bei Versuch ${attempt}:`, processError.message);

            if (attempt < MAX_API_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                return fetchWithDecompression(url, attempt + 1);
            }

            throw processError;
        }

    } catch (error) {
        // Netzwerkfehler - auch hier Retry
        if ((error.name === 'TypeError' || error.message.includes('network')) && attempt < MAX_API_RETRIES) {
            console.warn(`Netzwerkfehler bei Versuch ${attempt}:`, error.message);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            return fetchWithDecompression(url, attempt + 1);
        }
        throw error;
    }
}

/**
 * Ruft die Gebetszeiten von der API ab.
 * @param {number} lat - Breitengrad
 * @param {number} lon - Längengrad
 * @param {number} method - Berechnungsmethode
 * @param {Date} [date] - Optionales Datum. Wenn nicht angegeben, wird das aktuelle Datum verwendet.
 */
export async function fetchPrayerTimes(lat, lon, method, date) {
    const currentDate = date || getCurrentTime();
    const formattedDate = formatDateForApi(currentDate);

    let apiUrl = `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${lat}&longitude=${lon}&method=${method}`;

    if (method === 99) {
        if (typeof methodSettingsParam !== 'undefined' && methodSettingsParam !== null && methodSettingsParam.trim() !== '') {
            apiUrl += `&methodSettings=${encodeURIComponent(methodSettingsParam)}`;
        }
    }
    if (typeof tuneOffsets !== 'undefined' && tuneOffsets && tuneOffsets.trim() !== '') {
        apiUrl += `&tune=${encodeURIComponent(tuneOffsets)}`;
    }

    try {
        const data = await fetchWithDecompression(apiUrl);

        if (data.code === 200 && data.data && data.data.timings) {
            return data.data.timings;
        } else {
            const errorMessage = data.data || data.status || 'Unbekannter API Fehler.';
            throw new Error(`API Error: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Gebetszeiten:', error);
        throw error;
    }
}

/**
 * Ruft das islamische Datum für ein gegebenes gregorianisches Datum von der API ab.
 */
async function fetchIslamicDateFor(date) {
    const formattedGregorianDate = formatDateForApi(date);
    const apiUrl = `https://api.aladhan.com/v1/gToH?date=${formattedGregorianDate}`;

    try {
        const data = await fetchWithDecompression(apiUrl);

        if (data.code === 200 && data.data && data.data.hijri) {
            return { ...data.data.hijri, source: 'api' };
        } else {
            const errorMessage = data.data || data.status || 'Unbekannter Hijri API Fehler.';
            throw new Error(`Hijri API Error: ${errorMessage}`);
        }
    } catch (error) {
        console.error(`Fehler beim Abrufen des islamischen Datums für ${formattedGregorianDate}:`, error);
        throw error;
    }
}

/**
 * Ruft das islamische Datum für das aktuelle Datum von der API ab.
 */
export function fetchCurrentIslamicDate() {
    return fetchIslamicDateFor(getCurrentTime());
}

/**
 * Ruft das islamische Datum für morgen von der API ab.
 */
export function fetchIslamicDateForTomorrow(today) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return fetchIslamicDateFor(tomorrow);
}
