/* Source: POST https://portswigger.net/api/widgets (widgetId academy-launch-mystery-lab).
   "levels" is each category's availablelevels attribute. Ids 4, 10 and 15 are not exposed.
   A classic script, not a fetched JSON: it works from disk and under any sub-path.
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
  ]
};
