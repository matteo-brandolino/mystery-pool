/*
 * The roll, with no DOM: which topics are eligible, and what to launch.
 * A classic script (window.MysteryRoll) so the page works from disk; also a
 * CommonJS module so Node's test runner can load it.
 *
 * Launch URL copied from updateUrl() in /bundles/widgets/mysterylab.js. It is built
 * by plain concatenation on purpose: the original does not encode the referrer,
 * and URLSearchParams would turn its slashes into %2F.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MysteryRoll = api;
})(typeof self !== 'undefined' ? self : this, () => {
  'use strict';

  const PS_ORIGIN = 'https://portswigger.net';
  const MYSTERY_REFERRER = '/web-security/mystery-lab-challenge';

  // PortSwigger's "Any" level id.
  const ANY = -1;

  const mysteryUrl = (categoryId, level) =>
    PS_ORIGIN + '/academy/labs/launchMystery?categoryId=' + categoryId +
    '&level=' + level + '&referrer=' + MYSTERY_REFERRER;

  // Port of isCategoryValidForLevel() in mysterylab.js.
  const isEligible = (topic, level) => level === ANY || topic.levels.includes(level);

  // The topics in the pool, in topic order.
  const inPool = (topics, poolIds) => {
    const ids = new Set(poolIds);
    return topics.filter((t) => ids.has(t.id));
  };

  const eligible = (topics, poolIds, level) =>
    inPool(topics, poolIds).filter((t) => isEligible(t, level));

  const choose = (list, random) => list[Math.floor(random() * list.length)];

  // random: () => [0, 1), like Math.random. Returns null when nothing is eligible.
  function pick(topics, poolIds, level, random) {
    const candidates = eligible(topics, poolIds, level);
    if (candidates.length === 0) return null;
    const topic = choose(candidates, random);
    return { topic, lab: null, url: mysteryUrl(topic.id, level) };
  }

  return Object.freeze({ ANY, isEligible, inPool, eligible, pick });
});
