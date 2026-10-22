/*
 * URL shape copied from updateUrl() in /bundles/widgets/mysterylab.js. It is built
 * by plain concatenation on purpose: the original does not encode the referrer,
 * and URLSearchParams would turn its slashes into %2F.
 *
 * onlyCompleted is never sent: this site cannot see which labs you completed.
 */
(() => {
  'use strict';

  const PS_ORIGIN = 'https://portswigger.net';
  const REFERRER = '/web-security/mystery-lab-challenge';

  // PortSwigger's own level ids, sent in the URL as they are. -1 is "Any".
  // Always numbers internally; strings exist only at the DOM boundary.
  const ANY = -1;
  const LEVELS = [
    { id: ANY, name: 'Any' },
    { id: 0, name: 'Apprentice', short: 'App' },
    { id: 1, name: 'Practitioner', short: 'Prac' },
    { id: 2, name: 'Expert', short: 'Exp' }
  ];
  const DEFAULT_LEVEL = 1;
  const levelById = new Map(LEVELS.map((lv) => [lv.id, lv]));
  const levelName = (id) => levelById.get(id).name;

  const el = {
    grid: document.getElementById('categoryGrid'),
    poolCount: document.getElementById('poolCount'),
    selectAll: document.getElementById('selectAll'),
    selectNone: document.getElementById('selectNone'),
    levelControl: document.getElementById('levelControl'),
    rollBtn: document.getElementById('rollBtn'),
    status: document.getElementById('status'),
    result: document.getElementById('result'),
    resultCat: document.getElementById('resultCat'),
    openLabBtn: document.getElementById('openLabBtn'),
    spoiler: document.querySelector('.spoiler'),
    dataStamp: document.getElementById('dataStamp')
  };

  let categories = [];
  let groups = [];
  let categoryById = new Map();
  let pendingUrl = null;
  const pool = new Set();

  const launchUrl = (categoryId, level) =>
    PS_ORIGIN + '/academy/labs/launchMystery?categoryId=' + categoryId +
    '&level=' + level + '&referrer=' + REFERRER;

  const currentLevel = () => Number(el.levelControl.querySelector('input:checked').value);

  // Port of isCategoryValidForLevel() in mysterylab.js.
  const isEligible = (cat, level) =>
    level === ANY || cat.levels.includes(level);

  const picked = () => categories.filter((c) => pool.has(c.id));

  const rollable = (level) => picked().filter((c) => isEligible(c, level));

  const levelList = (cat, separator) => cat.levels.map(levelName).join(separator);

  function loadCategories(data) {
    if (!data || typeof data.fetched !== 'string' || !Array.isArray(data.categories)) {
      return null;
    }
    return Object.freeze(data.categories.map((c) => Object.freeze({
      id: c.id,
      name: c.name,
      levels: Object.freeze(c.levels
        .filter((id) => id !== ANY && levelById.has(id))
        .sort((a, b) => a - b))
    })));
  }

  // Groups reference categories by id; unknown ids are dropped, and any category
  // no group claims lands in a trailing "Other" group so it is never unreachable.
  function loadGroups(data, cats) {
    const known = new Map(cats.map((c) => [c.id, c]));
    const out = (Array.isArray(data.groups) ? data.groups : []).map((g) => ({
      phase: g.phase,
      name: g.name,
      cats: g.ids.filter((id) => known.has(id)).map((id) => known.get(id))
    }));
    const claimed = new Set(out.flatMap((g) => g.cats.map((c) => c.id)));
    const rest = cats.filter((c) => !claimed.has(c.id));
    if (rest.length) out.push({ name: 'Other', cats: rest });
    return out;
  }

  function buildLevelControl() {
    LEVELS.forEach((lv) => {
      const label = document.createElement('label');

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'level';
      radio.value = String(lv.id);
      radio.checked = lv.id === DEFAULT_LEVEL;

      const text = document.createElement('span');
      text.textContent = lv.name;

      label.append(radio, text);
      el.levelControl.appendChild(label);
    });
  }

  function buildCategory(cat) {
    const label = document.createElement('label');
    label.className = 'cat';
    label.dataset.id = String(cat.id);

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.value = String(cat.id);
    box.checked = pool.has(cat.id);
    box.addEventListener('change', () => {
      box.checked ? pool.add(cat.id) : pool.delete(cat.id);
      render();
    });

    const name = document.createElement('span');
    name.className = 'cat-name';
    name.textContent = cat.name;

    const levels = document.createElement('span');
    levels.className = 'levels';
    cat.levels.forEach((id) => {
      const badge = document.createElement('span');
      badge.className = 'lv';
      badge.dataset.level = String(id);
      badge.textContent = levelById.get(id).short;
      badge.title = levelName(id) + ' labs available';
      levels.appendChild(badge);
    });

    label.append(box, name, levels);
    return label;
  }

  // One checkbox per group: ticks or clears every topic in it. Its state is derived
  // from the pool in render(), so it can show "some" (indeterminate) as well.
  function buildGroupToggle(group) {
    const label = document.createElement('label');
    label.className = 'group-toggle';
    label.title = 'Select all topics in ' + group.name;

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.addEventListener('change', () => {
      group.cats.forEach((c) => (box.checked ? pool.add(c.id) : pool.delete(c.id)));
      render();
    });

    const text = document.createElement('span');
    text.textContent = 'All';

    label.append(box, text);
    group.toggle = box;
    return label;
  }

  function buildGrid() {
    el.grid.textContent = '';

    groups.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'cat-group';

      const phase = document.createElement('p');
      phase.className = 'cat-phase';
      phase.textContent = group.phase || '';

      const title = document.createElement('h3');
      title.textContent = group.name;

      const grid = document.createElement('div');
      grid.className = 'cat-grid';
      group.cats.forEach((cat) => grid.appendChild(buildCategory(cat)));

      const head = document.createElement('div');
      head.className = 'cat-group-head';
      const heading = document.createElement('div');
      heading.append(phase, title);
      head.append(heading, buildGroupToggle(group));

      section.append(head, grid);
      el.grid.appendChild(section);
    });
  }

  function render() {
    const level = currentLevel();
    const inPool = picked();
    const eligible = rollable(level);
    const blocked = inPool.filter((c) => !isEligible(c, level));

    el.grid.querySelectorAll('.cat').forEach((label) => {
      const cat = categoryById.get(Number(label.dataset.id));
      const ok = isEligible(cat, level);

      label.querySelector('input').checked = pool.has(cat.id);
      label.classList.toggle('is-ineligible', !ok);
      label.classList.toggle('is-picked', pool.has(cat.id));
      label.title = ok ? '' :
        cat.name + ' has no ' + levelName(level) + ' labs (only ' + levelList(cat, ', ') + ')';

      label.querySelectorAll('.lv').forEach((badge) => {
        badge.classList.toggle('is-active', Number(badge.dataset.level) === level);
      });
    });

    groups.forEach((g) => {
      const n = g.cats.filter((c) => pool.has(c.id)).length;
      g.toggle.checked = n > 0 && n === g.cats.length;
      g.toggle.indeterminate = n > 0 && n < g.cats.length;
    });

    el.poolCount.textContent = inPool.length + ' selected';
    el.rollBtn.disabled = eligible.length === 0;
    el.status.classList.toggle('is-blocked', inPool.length > 0 && eligible.length === 0);

    if (inPool.length === 0) {
      el.status.textContent = 'Pick at least one topic.';
    } else if (eligible.length === 0) {
      el.status.textContent =
        'Nothing to roll: no topic in your pool has ' + levelName(level) + ' labs. ' +
        describe(blocked) + ' Change the level, or widen the pool.';
    } else if (blocked.length > 0) {
      el.status.textContent =
        'Rolling across ' + eligible.length + ' of ' + inPool.length + ' topics. ' +
        'Skipped at ' + levelName(level) + ': ' + describe(blocked);
    } else {
      el.status.textContent = 'Rolling across ' + eligible.length +
        (eligible.length === 1 ? ' topic.' : ' topics.');
    }

    writeHash(level);
  }

  const describe = (cats) =>
    cats.map((c) => c.name + ' (' + levelList(c, '/') + ')').join(', ') + '.';

  function roll() {
    const level = currentLevel();
    const eligible = rollable(level);
    if (eligible.length === 0) return;

    const cat = eligible[Math.floor(Math.random() * eligible.length)];
    const url = launchUrl(cat.id, level);

    // Neither the URL nor the category is shown: the URL carries categoryId,
    // and that would spoil the mystery. The name sits behind a collapsed toggle.
    pendingUrl = url;
    el.resultCat.textContent = cat.name + ' · ' + levelName(level);
    el.spoiler.open = false;
    el.result.hidden = false;

    openLab(url);
  }

  // Opens a blank tab and navigates it from script. A renderer-initiated navigation
  // keeps about:blank in the address bar until the response commits, and the response
  // is a redirect to the lab, so the categoryId URL should never be shown. An anchor
  // click would display it. noopener can't be used (window.open would return null), so
  // the opener link is cut by hand while the tab is still same-origin about:blank.
  function openLab(url) {
    const w = window.open('about:blank', '_blank');
    if (!w) return;
    w.opener = null;
    w.location.replace(url);
  }

  function clearResult() {
    pendingUrl = null;
    el.result.hidden = true;
    el.spoiler.open = false;
  }

  function writeHash(level) {
    const ids = [...pool].sort((a, b) => a - b);
    const hash = ids.length ? '#p=' + ids.join(',') + '&lv=' + level : '';
    history.replaceState(null, '', location.pathname + location.search + hash);
  }

  // Pre-selects a pool from the hash. It never rolls on its own.
  function readHash() {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return false;
    const params = new URLSearchParams(raw);
    const ids = (params.get('p') || '')
      .split(',')
      .map((n) => Number(n.trim()))
      .filter((n) => categoryById.has(n));
    if (ids.length === 0) return false;
    const lv = params.get('lv');
    setSelection(ids, lv ? Number(lv) : null);
    return true;
  }

  // level: a number, or null to keep the current one.
  function setSelection(ids, level) {
    pool.clear();
    ids.forEach((id) => pool.add(id));
    if (levelById.has(level)) {
      el.levelControl.querySelector('input[value="' + level + '"]').checked = true;
    }
    el.grid.querySelectorAll('.cat input').forEach((box) => {
      box.checked = pool.has(Number(box.value));
    });
    render();
  }

  function wire() {
    el.rollBtn.addEventListener('click', roll);

    el.openLabBtn.addEventListener('click', () => {
      if (pendingUrl) openLab(pendingUrl);
    });

    el.selectAll.addEventListener('click', () => {
      setSelection(categories.map((c) => c.id), null);
    });

    el.selectNone.addEventListener('click', () => {
      setSelection([], null);
    });

    el.levelControl.addEventListener('change', () => {
      clearResult();
      render();
    });
  }

  function init() {
    const data = window.PS_CATEGORIES;
    const loaded = loadCategories(data);
    if (!loaded) {
      el.grid.textContent = 'Topic data is missing or malformed — check data/categories.js.';
      el.status.textContent = 'Topic data unavailable.';
      return;
    }
    categories = loaded;
    categoryById = new Map(categories.map((c) => [c.id, c]));
    groups = loadGroups(data, categories);
    el.dataStamp.textContent = 'Topic data captured ' + data.fetched + '.';
    buildLevelControl();
    buildGrid();
    wire();
    if (!readHash()) render();
  }

  init();
})();
