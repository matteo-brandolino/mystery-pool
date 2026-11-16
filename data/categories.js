/* Source: POST https://portswigger.net/api/widgets (widgetId academy-launch-mystery-lab).
   "levels" is each category's availablelevels attribute. Ids 4, 10 and 15 are not exposed.
   A topic without "kind" is a mystery category. "kind": "direct" marks a topic with no
   mystery pool: it carries its own "labs" (from the all-labs page) and its levels are
   derived from them.
   A classic script, not a fetched JSON: it works from disk and under any sub-path.
   "groups" is the user's own split by lab goal; an id may appear in more than one group.
   Regenerate with the command in README.md. */
window.PS_CATEGORIES = {
  "fetched": "2026-10-04",
  "categories": [
    { "id": 1,  "name": "SQL injection",                           "levels": [1] },
    { "id": 2,  "name": "Cross-site scripting",                    "levels": [0, 1, 2] },
    { "id": 3,  "name": "Cross-site request forgery (CSRF)",       "levels": [0, 1] },
    { "id": 5,  "name": "DOM-based vulnerabilities",               "levels": [1, 2] },
    { "id": 6,  "name": "Cross-origin resource sharing (CORS)",    "levels": [0, 1] },
    { "id": 7,  "name": "XML external entity (XXE) injection",     "levels": [0, 1, 2] },
    { "id": 8,  "name": "Server-side request forgery (SSRF)",      "levels": [0, 1, 2] },
    { "id": 9,  "name": "HTTP request smuggling",                  "levels": [1, 2] },
    { "id": 10, "name": "OS command injection", "kind": "direct", "labs": [
      { "labId": "2b08de150e353dc1c0057519f466a55a0ca4a7901b2469d56ef7d2a80eddeaa6", "level": 0,
        "title": "OS command injection, simple case",
        "path": "/web-security/os-command-injection/lab-simple" },
      { "labId": "28bda028c1ba840a8f4fccaaad3739fdc8d8e2d195f348c0db992cbcd6971cbf", "level": 1,
        "title": "Blind OS command injection with time delays",
        "path": "/web-security/os-command-injection/lab-blind-time-delays" },
      { "labId": "794c7ab29027c16b9a3fab84326c6f313a8af27a96f1833828edd38b26a4aca7", "level": 1,
        "title": "Blind OS command injection with output redirection",
        "path": "/web-security/os-command-injection/lab-blind-output-redirection" },
      { "labId": "6e6e115e1981ae822b7e41fcaccbc1cb96a5d85b63b42b80e3e6d35565209752", "level": 1,
        "title": "Blind OS command injection with out-of-band interaction",
        "path": "/web-security/os-command-injection/lab-blind-out-of-band" },
      { "labId": "3c2c7dc2a5f53dc680195c18c290e82bc97c28f599414db388cf8cf96cb72bf5", "level": 1,
        "title": "Blind OS command injection with out-of-band data exfiltration",
        "path": "/web-security/os-command-injection/lab-blind-out-of-band-data-exfiltration" }
    ] },
    { "id": 11, "name": "Server-side template injection",          "levels": [1] },
    { "id": 12, "name": "Path traversal",                          "levels": [0, 1] },
    { "id": 13, "name": "Access control vulnerabilities",          "levels": [0] },
    { "id": 14, "name": "Authentication",                          "levels": [0, 1] },
    { "id": 16, "name": "Web cache poisoning",                     "levels": [1, 2] },
    { "id": 17, "name": "Insecure deserialization",                "levels": [0, 1, 2] },
    { "id": 18, "name": "Information disclosure",                  "levels": [0, 1] },
    { "id": 19, "name": "Business logic vulnerabilities",          "levels": [0, 1, 2] },
    { "id": 20, "name": "HTTP Host header attacks",                "levels": [0, 1, 2] },
    { "id": 21, "name": "OAuth authentication",                    "levels": [1, 2] },
    { "id": 22, "name": "File upload vulnerabilities",             "levels": [0, 1] },
    { "id": 23, "name": "JWT",                                     "levels": [0, 1, 2] }
  ],
  "groups": [
    { "phase": "Foothold", "name": "Get access to any user",
      "ids": [2, 5, 14, 16, 20, 9] },
    { "phase": "Escalation", "name": "Promote yourself to an administrator or steal their data",
      "ids": [1, 3, 17, 21, 23, 13] },
    { "phase": "Exfiltration", "name": "Read the content of /home/carlos/secret",
      "ids": [8, 7, 11, 12, 17, 22, 10] },
    { "phase": "Misc", "name": "Everything else",
      "ids": [6, 18, 19] }
  ]
};
