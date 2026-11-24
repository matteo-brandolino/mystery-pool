#!/usr/bin/env python3
"""Regenerate the direct topics in data/categories.js from PortSwigger's public pages.

A direct topic is an Academy section with no Mystery Lab pool, so the page launches
one of its labs itself. Its labs come from:

  1. GET /web-security/all-labs: one <h2 id> per section, followed by
     <div widget-id="academy-labstatus" widget-lab-id="..."> per lab.
  2. POST /api/widgets with academy-labstatus for those ids (unauthenticated):
     level label, title and page path of each lab.

Standard library only. Prints the direct topics as JSON; with --write it replaces
them in data/categories.js and sets "directFetched". Problems go to stderr, and
--write refuses to run when there are any (override with --force).
"""

import argparse
import datetime
import html
import json
import pathlib
import re
import sys
import urllib.request

PS_ORIGIN = 'https://portswigger.net'
DATA_FILE = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'categories.js'

LEVELS = {'APPRENTICE': 0, 'PRACTITIONER': 1, 'EXPERT': 2}

# Section anchor -> (id, name). 4, 10 and 15 are the ids the Mystery widget skips;
# 100+ are ours, kept clear of any id PortSwigger may add later.
DIRECT = {
    'clickjacking': (4, 'Clickjacking'),
    'os-command-injection': (10, 'OS command injection'),
    'websockets': (15, 'WebSockets'),
    'api-testing': (102, 'API testing'),
    'graphql-api-vulnerabilities': (103, 'GraphQL API vulnerabilities'),
    'race-conditions': (104, 'Race conditions'),
    'nosql-injection': (105, 'NoSQL injection'),
    'web-llm-attacks': (106, 'Web LLM attacks'),
    'web-cache-deception': (107, 'Web cache deception'),
}

# Prototype pollution is split by the lab's path. One lab is pulled out on its own,
# because it ends in remote code execution and so belongs to the exfiltration phase.
PROTOTYPE_POLLUTION_LABS = {
    '/web-security/prototype-pollution/server-side/'
    'lab-remote-code-execution-via-server-side-prototype-pollution':
        (108, 'Prototype pollution (server-side RCE)'),
}
PROTOTYPE_POLLUTION = {
    '/client-side/': (100, 'Prototype pollution (client-side)'),
    '/server-side/': (101, 'Prototype pollution (server-side)'),
}

# Sections the Mystery widget already covers, plus ones left out on purpose:
# essential-skills isn't a vulnerability class, mcp-server-vulnerabilities isn't wanted.
SKIPPED = {
    'sql-injection', 'cross-site-scripting', 'cross-site-request-forgery-csrf',
    'dom-based-vulnerabilities', 'cross-origin-resource-sharing-cors',
    'xml-external-entity-xxe-injection', 'server-side-request-forgery-ssrf',
    'http-request-smuggling', 'server-side-template-injection', 'path-traversal',
    'access-control-vulnerabilities', 'authentication', 'web-cache-poisoning',
    'insecure-deserialization', 'information-disclosure', 'business-logic-vulnerabilities',
    'http-host-header-attacks', 'oauth-authentication', 'file-upload-vulnerabilities', 'jwt',
    'essential-skills', 'mcp-server-vulnerabilities',
}


def parse_sections(page):
    """[(anchor, [labId, ...])] in page order; lab ids lowercased as the launch URL uses them."""
    parts = re.split(r'<h2\b[^>]*\bid="([^"]+)"[^>]*>', page)
    return [(parts[i], [x.lower() for x in re.findall(r'widget-lab-id="([0-9A-Fa-f]+)"', parts[i + 1])])
            for i in range(1, len(parts), 2)]


def parse_labstatus(widget_html):
    """One academy-labstatus widget -> {labId, level, title, path}, or None if unreadable."""
    lab_id = re.search(r'\bid=([0-9A-Fa-f]+)', widget_html)
    level = re.search(r'class="label-[\w-]+-small">\s*(\w+)', widget_html)
    link = re.search(r'<a href="([^"]+)">([^<]+)</a>', widget_html)
    if not (lab_id and level and link) or level.group(1) not in LEVELS:
        return None
    path, title = link.groups()
    return {'labId': lab_id.group(1).lower(), 'level': LEVELS[level.group(1)],
            'title': html.unescape(title).strip(), 'path': html.unescape(path)}


def build_topics(sections, labs):
    """sections from parse_sections, labs {labId: lab}. Returns (topics sorted by id, warnings)."""
    topics, warnings = {}, []

    def add(topic_id, name, lab):
        topics.setdefault(topic_id, {'id': topic_id, 'name': name, 'kind': 'direct', 'labs': []})
        topics[topic_id]['labs'].append(lab)

    for anchor, ids in sections:
        if anchor in SKIPPED:
            continue
        if anchor not in DIRECT and anchor != 'prototype-pollution':
            warnings.append('unknown section %r (%d labs): not mapped to a topic' % (anchor, len(ids)))
            continue
        for lab_id in ids:
            lab = labs.get(lab_id)
            if lab is None:
                warnings.append('lab %s in %r: no labstatus data' % (lab_id, anchor))
            elif anchor in DIRECT:
                add(*DIRECT[anchor], lab)
            else:
                half = ([PROTOTYPE_POLLUTION_LABS[lab['path']]] if lab['path'] in PROTOTYPE_POLLUTION_LABS
                        else [v for k, v in PROTOTYPE_POLLUTION.items() if k in lab['path']])
                if half:
                    add(*half[0], lab)
                else:
                    warnings.append('lab %s (%s): neither client-side nor server-side'
                                    % (lab_id, lab['path']))

    return [topics[k] for k in sorted(topics)], warnings


def fetch_all_labs():
    req = urllib.request.Request(PS_ORIGIN + '/web-security/all-labs',
                                 headers={'User-Agent': 'mystery-pool'})
    with urllib.request.urlopen(req) as r:
        return r.read().decode('utf-8')


def fetch_labstatus(lab_ids, batch=50):
    """{labId: lab}. A lab whose widget can't be read is left out, and build_topics
    then reports it as having no labstatus data."""
    labs = {}
    for i in range(0, len(lab_ids), batch):
        body = json.dumps([{'widgetId': 'academy-labstatus',
                            'additionalData': {'widget-lab-id': x.upper()}}
                           for x in lab_ids[i:i + batch]]).encode()
        req = urllib.request.Request(PS_ORIGIN + '/api/widgets', data=body, headers={
            'Content-Type': 'application/json',
            'Widget-Source': '/web-security/all-labs',
            'User-Agent': 'mystery-pool',
        })
        with urllib.request.urlopen(req) as r:
            for w in json.load(r):
                lab = parse_labstatus(w['Html'])
                if lab:
                    labs[lab['labId']] = lab
    return labs


# --- data/categories.js -------------------------------------------------------

ASSIGN = 'window.PS_CATEGORIES = '


def read_data(text):
    head, _, payload = text.partition(ASSIGN)
    return head, json.loads(payload.strip().rstrip(';'))


def format_data(head, data):
    """Same layout as the hand-written file: one line per mystery topic and group."""
    j = lambda v: json.dumps(v, ensure_ascii=False)
    name_field = lambda c: '"name": ' + j(c['name']) + ','
    width = max((len(name_field(c)) for c in data['categories'] if c.get('kind') != 'direct'),
                default=0) + 4
    cats = []
    for c in data['categories']:
        prefix = '    { "id": %s %s' % ((j(c['id']) + ',').ljust(3), name_field(c))
        if c.get('kind') == 'direct':
            labs = ',\n'.join(
                '      { "labId": %s, "level": %d,\n        "title": %s,\n        "path": %s }'
                % (j(x['labId']), x['level'], j(x['title']), j(x['path'])) for x in c['labs'])
            cats.append('%s "kind": "direct", "labs": [\n%s\n    ] }' % (prefix, labs))
        else:
            cats.append('%s%s"levels": %s }' % (prefix, ' ' * (width - len(name_field(c))), j(c['levels'])))
    groups = ',\n'.join('    { "phase": %s, "name": %s,\n      "ids": %s }'
                        % (j(g['phase']), j(g['name']), j(g['ids'])) for g in data['groups'])
    stamps = '  "fetched": %s,\n' % j(data['fetched'])
    if 'directFetched' in data:
        stamps += '  "directFetched": %s,\n' % j(data['directFetched'])
    return ('%s%s{\n%s  "categories": [\n%s\n  ],\n  "groups": [\n%s\n  ]\n};\n'
            % (head, ASSIGN, stamps, ',\n'.join(cats), groups))


def merge(data, direct, today):
    """Replace every direct topic, keep the mystery ones, sort by id. "fetched" stays the
    mystery list's date; "directFetched" records this run."""
    keep = [c for c in data['categories'] if c.get('kind') != 'direct']
    clash = {c['id'] for c in keep} & {c['id'] for c in direct}
    if clash:
        raise ValueError('ids %s are mystery categories now: drop them from DIRECT'
                         % sorted(clash))
    return {**data, 'directFetched': today,
            'categories': sorted(keep + direct, key=lambda c: c['id'])}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--write', action='store_true', help='update data/categories.js in place')
    ap.add_argument('--force', action='store_true', help='--write even if there were warnings')
    args = ap.parse_args()

    sections = parse_sections(fetch_all_labs())
    wanted = [x for anchor, ids in sections
              if anchor in DIRECT or anchor == 'prototype-pollution' for x in ids]
    topics, warnings = build_topics(sections, fetch_labstatus(wanted))
    for w in warnings:
        print('warning: ' + w, file=sys.stderr)

    if not args.write:
        print(json.dumps(topics, indent=2, ensure_ascii=False))
        return
    if not topics:
        sys.exit('no direct topics found: has the all-labs page changed? Nothing written.')
    if warnings and not args.force:
        sys.exit('warnings above: nothing written. Fix the mapping, or rerun with --force.')
    head, data = read_data(DATA_FILE.read_text())
    merged = merge(data, topics, datetime.date.today().isoformat())
    DATA_FILE.write_text(format_data(head, merged))
    print('wrote %d direct topics (%d labs) to %s' % (
        len(topics), sum(len(t['labs']) for t in topics), DATA_FILE), file=sys.stderr)


if __name__ == '__main__':
    main()
