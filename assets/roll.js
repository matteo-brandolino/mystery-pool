/*
 * The roll, with no DOM: which topics are eligible, and what to launch.
 * A classic script (window.MysteryRoll) so the page works from disk; also a
 * CommonJS module so Node's test runner can load it.
 *
 * Two kinds of topic:
 *  - mystery: PortSwigger picks the lab. URL copied from updateUrl() in
 *    /bundles/widgets/mysterylab.js, built by plain concatenation on purpose: the
 *    original does not encode the referrer.
 *  - direct: no mystery pool exists, so a lab is picked here and launched the way
 *    the "ACCESS THE LAB" button (academy-launchlab widget) does, with the lab's own
 *    page as an encoded referrer.
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

  const directUrl = (lab) =>
    PS_ORIGIN + '/academy/labs/launch/' + lab.labId +
    '?referrer=' + encodeURIComponent(lab.path);

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
    if (topic.kind !== 'direct') {
      return { topic, lab: null, url: mysteryUrl(topic.id, level) };
    }
    const labs = topic.labs.filter((lab) => level === ANY || lab.level === level);
    const lab = choose(labs, random);
    return { topic, lab, url: directUrl(lab) };
  }

  return Object.freeze({ ANY, isEligible, inPool, eligible, pick });
});
