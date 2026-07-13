function getEl(id) {
    return document.getElementById(id);
}

const framesInput = getEl('frames');
const spinUpButton = getEl('spinUp');
const spinDownButton = getEl('spinDown');

spinUpButton.addEventListener('click', function () {
    let currentValue = parseInt(framesInput.value) || 0;
    let maxValue = parseInt(framesInput.max) || 20;
    if (currentValue < maxValue) {
        framesInput.value = currentValue + 1;
        framesInput.dispatchEvent(new Event('input'));
    }
});

spinDownButton.addEventListener('click', function () {
    let currentValue = parseInt(framesInput.value) || 0;
    let minValue = parseInt(framesInput.min) || 1;
    if (currentValue > minValue) {
        framesInput.value = currentValue - 1;
        framesInput.dispatchEvent(new Event('input'));
    }
});

framesInput.addEventListener('wheel', function (event) {
    event.preventDefault();
});

function parseRefs(rawText) {
    let trimmed = rawText.trim();
    let pieces = trimmed.split(/[\s,]+/);
    let result = [];
    for (let i = 0; i < pieces.length; i++) {
        if (pieces[i] !== '') {
            result.push(pieces[i]);
        }
    }
    return result;
}

function isCoreAllowedChar(ch) {
    if (ch >= 'a' && ch <= 'z') return true;
    if (ch >= 'A' && ch <= 'Z') return true;
    if (ch >= '0' && ch <= '9') return true;
    if (ch === ' ' || ch === ',' || ch === '-') return true;
    return false;
}

function isExceptionChar(ch) {
    return ch === '.' || ch === "'" || ch === '/';
}

function validateRefs(rawText) {
    let blockedChars = '';
    let warnChars = '';

    for (let i = 0; i < rawText.length; i++) {
        let ch = rawText[i];
        if (isCoreAllowedChar(ch)) {
            continue;
        }
        if (isExceptionChar(ch)) {
            if (warnChars.indexOf(ch) === -1) {
                warnChars += ch;
            }
        } else {
            if (blockedChars.indexOf(ch) === -1) {
                blockedChars += ch;
            }
        }
    }

    return {
        valid: blockedChars.length === 0,
        invalidChars: blockedChars,
        warnChars: warnChars
    };
}

function isNegativeNumber(token) {
    if (token[0] !== '-') return false;
    let rest = token.slice(1);
    if (rest.length === 0) return false;
    for (let i = 0; i < rest.length; i++) {
        if (rest[i] < '0' || rest[i] > '9') return false;
    }
    return true;
}

function checkNegativeNumbers(refs) {
    for (let i = 0; i < refs.length; i++) {
        if (isNegativeNumber(refs[i])) return true;
    }
    return false;
}

function isAllDigits(token) {
    if (token.length === 0) return false;
    for (let i = 0; i < token.length; i++) {
        if (token[i] < '0' || token[i] > '9') return false;
    }
    return true;
}

function isAllLetters(token) {
    if (token.length === 0) return false;
    for (let i = 0; i < token.length; i++) {
        let ch = token[i];
        let isLower = ch >= 'a' && ch <= 'z';
        let isUpper = ch >= 'A' && ch <= 'Z';
        if (!isLower && !isUpper) return false;
    }
    return true;
}

function checkMixedTypes(refs) {
    let hasNumber = false;
    let hasLetter = false;
    for (let i = 0; i < refs.length; i++) {
        if (isAllDigits(refs[i])) hasNumber = true;
        if (isAllLetters(refs[i])) hasLetter = true;
    }
    return hasNumber && hasLetter;
}

function charsToBadgeHtml(chars, escapeSpace) {
    let parts = [];
    for (let i = 0; i < chars.length; i++) {
        let ch = chars[i];
        if (escapeSpace && ch === ' ') {
            ch = '␣';
        }
        parts.push('<span class="bad-char">' + ch + '</span>');
    }
    return parts.join(' ');
}

function showWarning(msg) {
    let banner = getEl('warnBanner');
    let msgEl = getEl('warnMsg');
    msgEl.innerHTML = msg;
    banner.classList.add('show');
}

function showCharWarning(warnChars) {
    let warnBadges = charsToBadgeHtml(warnChars, false);
    let plural = '';
    if (warnChars.length > 1) {
        plural = 's';
    }
    showWarning('Found special character' + plural + ': ' + warnBadges + ' - these are allowed but may affect how references are read.');
}

function hideWarning() {
    getEl('warnBanner').classList.remove('show');
}

function showError(title, msg) {
    getEl('errTitle').textContent = title;
    getEl('errMsg').textContent = msg;
    getEl('errBanner').classList.add('show');
}

function clearError() {
    getEl('errBanner').classList.remove('show');
}

function runFIFO(refs, frameCount) {
    let queue = [];
    let steps = [];
    let hits = 0;
    let faults = 0;

    for (let i = 0; i < refs.length; i++) {
        let page = refs[i];
        let isHit = queue.indexOf(page) !== -1;
        let replacedPage = null;
        let newPage = null;

        if (isHit) {
            hits++;
        } else {
            faults++;
            if (queue.length < frameCount) {
                queue.push(page);
            } else {
                replacedPage = queue.shift();
                queue.push(page);
            }
            newPage = page;
        }

        steps.push({
            p: page,
            queue: queue.slice(),
            hit: isHit,
            replaced: replacedPage,
            newPage: newPage
        });
    }

    return { steps: steps, hits: hits, faults: faults, total: refs.length };
}

function runLRU(refs, frameCount) {
    let order = [];
    let steps = [];
    let hits = 0;
    let faults = 0;

    for (let i = 0; i < refs.length; i++) {
        let page = refs[i];
        let position = order.indexOf(page);
        let isHit = position !== -1;
        let replacedPage = null;
        let newPage = null;

        if (isHit) {
            order.splice(position, 1);
            order.push(page);
            hits++;
        } else {
            faults++;
            if (order.length < frameCount) {
                order.push(page);
            } else {
                replacedPage = order.shift();
                order.push(page);
            }
            newPage = page;
        }

        steps.push({
            p: page,
            queue: order.slice(),
            hit: isHit,
            replaced: replacedPage,
            newPage: newPage
        });
    }

    return { steps: steps, hits: hits, faults: faults, total: refs.length };
}

function colgroup(columnCount) {
    let html = '<colgroup><col class="c-label">';
    for (let i = 0; i < columnCount; i++) {
        html += '<col class="c-data">';
    }
    html += '</colgroup>';
    return html;
}

function buildScheduleTable(steps, frameCount) {
    let slots = [];
    for (let i = 0; i < frameCount; i++) {
        slots.push(null);
    }
    let nextSlot = 0;
    let slotHistory = [];

    for (let i = 0; i < steps.length; i++) {
        let step = steps[i];
        let newSlotIndex = -1;

        if (!step.hit) {
            if (step.replaced !== null) {
                let replacedIndex = slots.indexOf(step.replaced);
                if (replacedIndex !== -1) {
                    slots[replacedIndex] = step.p;
                    newSlotIndex = replacedIndex;
                }
            } else {
                slots[nextSlot] = step.p;
                newSlotIndex = nextSlot;
                nextSlot++;
            }
        }

        slotHistory.push({ slots: slots.slice(), newSlotIndex: newSlotIndex });
    }

    let html = '<table>' + colgroup(steps.length);
    html += '<thead><tr class="ref-hdr"><th class="lbl-th">Page Ref</th>';
    for (let i = 0; i < steps.length; i++) {
        let headerClass = 'fault-h';
        if (steps[i].hit) {
            headerClass = 'hit-h';
        }
        html += '<th class="' + headerClass + '">' + steps[i].p + '</th>';
    }
    html += '</tr></thead><tbody>';

    for (let f = 0; f < frameCount; f++) {
        html += '<tr class="frame-row"><td>Frame ' + (f + 1) + '</td>';
        for (let i = 0; i < slotHistory.length; i++) {
            let value = slotHistory[i].slots[f];
            let isNewSlot = slotHistory[i].newSlotIndex === f && !steps[i].hit;

            if (value === null) {
                html += '<td style="color:#7d8ba0">-</td>';
            } else if (isNewSlot) {
                html += '<td class="cell-new">' + value + '</td>';
            } else if (steps[i].hit) {
                html += '<td class="hc">' + value + '</td>';
            } else {
                html += '<td class="fc">' + value + '</td>';
            }
        }
        html += '</tr>';
    }

    html += '<tr class="status-row"><td>Status</td>';
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].hit) {
            html += '<td><span class="h-badge">Hit</span></td>';
        } else {
            html += '<td><span class="f-badge">Fault</span></td>';
        }
    }
    html += '</tr></tbody></table>';

    return html;
}

function buildSolutionTable(steps, frameCount) {
    let html = '<table>' + colgroup(steps.length);
    html += '<thead><tr class="sol-hdr"><th class="lbl-th">Frame</th>';
    for (let i = 0; i < steps.length; i++) {
        let headerClass = 'fault-sh';
        if (steps[i].hit) {
            headerClass = 'hit-sh';
        }
        html += '<th class="' + headerClass + '">' + steps[i].p + '</th>';
    }
    html += '</tr></thead><tbody>';

    for (let r = 0; r < frameCount; r++) {
        html += '<tr class="sol-frame-row"><td>Frame ' + (r + 1) + '</td>';
        for (let i = 0; i < steps.length; i++) {
            let step = steps[i];
            let stackIndex = step.queue.length - 1 - r;
            let value = null;
            if (stackIndex >= 0) {
                value = step.queue[stackIndex];
            }
            let isNewPage = !step.hit && step.newPage !== null && value === step.newPage && r === 0;

            if (value === null) {
                html += '<td class="sol-empty">-</td>';
            } else if (isNewPage) {
                html += '<td class="sol-new">' + value + '</td>';
            } else if (step.hit) {
                html += '<td class="sol-h">' + value + '</td>';
            } else {
                html += '<td class="sol-f">' + value + '</td>';
            }
        }
        html += '</tr>';
    }

    html += '</tbody></table>';
    return html;
}

function buildStats(result, frameCount) {
    let hits = result.hits;
    let faults = result.faults;
    let total = result.total;
    let hitRatio = hits / total;
    let faultRatio = faults / total;
    let hitPercent = hitRatio * 100;
    let faultPercent = faultRatio * 100;

    let html = '<div class="stats-section">';
    html += '<div class="stats-section-title">Simulation Statistics</div>';
    html += '<div class="stats-table-wrap">';
    html += '<table class="stats-table"><thead><tr><th>References</th><th>Frames</th></tr></thead>';
    html += '<tbody><tr><td class="stat-val-highlight">' + total + '</td><td class="stat-val-highlight">' + frameCount + '</td></tr></tbody>';
    html += '</table></div>';

    html += '<div class="stats-cards">';
    html += '<div class="stat-card s-green"><div class="stat-lbl">Total Hits</div><div class="stat-val">' + hits + '</div></div>';
    html += '<div class="stat-card s-red"><div class="stat-lbl">Total Faults</div><div class="stat-val">' + faults + '</div></div>';
    html += '<div class="stat-card s-blue"><div class="stat-lbl">Hit Ratio</div><div class="stat-val">' + hitRatio.toFixed(2) + '</div></div>';
    html += '<div class="stat-card s-amber"><div class="stat-lbl">Fault Ratio</div><div class="stat-val">' + faultRatio.toFixed(2) + '</div></div>';
    html += '<div class="stat-card s-purple"><div class="stat-lbl">Hit %</div><div class="stat-val">' + hitPercent.toFixed(1) + '%</div></div>';
    html += '<div class="stat-card s-coral"><div class="stat-lbl">Fault %</div><div class="stat-val">' + faultPercent.toFixed(1) + '%</div></div>';
    html += '</div>';

    html += '</div>';
    return html;
}

function renderAlgo(name, result, frameCount) {
    let steps = result.steps;

    let fullName = 'Least Recently Used';
    if (name === 'FIFO') {
        fullName = 'First In First Out';
    }

    let scheduleTable = buildScheduleTable(steps, frameCount);
    let solutionTable = buildSolutionTable(steps, frameCount);
    let statsHtml = buildStats(result, frameCount);

    let html = '<div class="algo-hdr">';
    html += '<div class="algo-pill">' + name + '</div>';
    html += '<div class="algo-subtitle">' + fullName + '</div>';
    html += '</div>';

    html += '<div class="legend">';
    html += '<div class="leg-item"><div class="leg-dot" style="background:#ffb454;border:1px solid #ffb454"></div>New page</div>';
    html += '<div class="leg-item"><div class="leg-dot" style="background:#ff5d6c"></div>Fault</div>';
    html += '<div class="leg-item"><div class="leg-dot" style="background:#3ee08a"></div>Hit</div>';
    html += '<div class="leg-item"><div class="leg-dot" style="background:#1c2732;border:1px solid #2a3846"></div>Empty</div>';
    html += '</div>';

    html += '<div class="tbl-pair">';
    html += '<div class="tbl-section-label"><span style="background:#35e0c9"></span>Simulation Schedule</div>';
    html += scheduleTable;
    html += '<div class="tbl-section-label" style="border-top:2px solid var(--border2)"><span style="background:#3ee08a"></span>Solution Table</div>';
    html += solutionTable;
    html += '</div>';

    html += statsHtml;

    return html;
}

function showEmptyMessage(icon, text) {
    getEl('out').innerHTML = '';
    let emptyBox = getEl('empty');
    emptyBox.style.display = 'block';
    emptyBox.innerHTML = '<div class="empty-icon">' + icon + '</div><div>' + text + '</div>';
}

function showBlockingError(title, shortMsg, longMsg) {
    showEmptyMessage('⚠', shortMsg);
    showError(title, longMsg);
}

function run() {
    clearError();
    hideWarning();

    let raw = getEl('refs').value;
    let validation = validateRefs(raw);

    if (validation.warnChars) {
        showCharWarning(validation.warnChars);
    }

    if (!validation.valid) {
        showBlockingError('Invalid character detected', 'Invalid character(s) detected.', "Only letters, numbers, spaces, commas, hyphens, and the special characters . ' / are allowed. Remove the invalid character(s) and try again.");
        return;
    }

    let algo = getEl('algo').value;
    let frameCount = parseInt(getEl('frames').value);

    if (isNaN(frameCount) || frameCount < 1) {
        showBlockingError('Invalid frame count', 'Number of frames must be at least 1.', 'Number of frames must be at least 1.');
        return;
    }

    let refs = parseRefs(raw);

    if (refs.length === 0) {
        showEmptyMessage('⌨', 'Start typing page references above...');
        return;
    }

    if (checkNegativeNumbers(refs)) {
        showBlockingError('Negative number detected', 'Negative numbers are not allowed.', 'Page references must be non-negative whole numbers or letters only. Remove the minus sign(s) and try again.');
        return;
    }

    if (checkMixedTypes(refs)) {
        showBlockingError('Mixed input types not allowed', 'Please use either all numbers or all letters - not both.', 'Your reference string mixes numbers and letters. Use one type only, e.g. "7 0 1 2" or "A B C D".');
        return;
    }

    getEl('empty').style.display = 'none';

    let html = '<div class="res-card">';
    if (algo === 'BOTH') {
        html += renderAlgo('FIFO', runFIFO(refs, frameCount), frameCount);
        html += '<hr class="divider">';
        html += renderAlgo('LRU', runLRU(refs, frameCount), frameCount);
    } else if (algo === 'FIFO') {
        html += renderAlgo('FIFO', runFIFO(refs, frameCount), frameCount);
    } else {
        html += renderAlgo('LRU', runLRU(refs, frameCount), frameCount);
    }
    html += '</div>';

    getEl('out').innerHTML = html;
}

const DEFAULT_REFS = '';

function clearInput() {
    clearError();
    hideWarning();
    getEl('refs').value = DEFAULT_REFS;
    getEl('refs').focus();
    run();
}

function randomize() {
    clearError();
    hideWarning();

    let frameCount = Math.floor(Math.random() * 5) + 1;
    framesInput.value = frameCount;

    let refCount = Math.floor(Math.random() * 8) + 8;
    let pageCount = Math.floor(Math.random() * 5) + 3;
    let refs = [];
    for (let i = 0; i < refCount; i++) {
        refs.push(Math.floor(Math.random() * pageCount));
    }
    getEl('refs').value = refs.join(' ');

    run();
}

getEl('refs').addEventListener('input', run);
getEl('frames').addEventListener('input', run);
getEl('algo').addEventListener('change', run);
getEl('clearInputBtn').addEventListener('click', clearInput);
getEl('randomBtn').addEventListener('click', randomize);

getEl('refs').addEventListener('blur', function () {
    let raw = getEl('refs').value;
    let validation = validateRefs(raw);
    if (validation.warnChars && raw.length > 0) {
        showCharWarning(validation.warnChars);
    } else {
        hideWarning();
    }
});

run();
