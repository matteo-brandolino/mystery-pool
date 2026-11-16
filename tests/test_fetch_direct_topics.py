import json
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))

import fetch_direct_topics as f  # noqa: E402

FIXTURES = ROOT / 'tests' / 'fixtures'
ALL_LABS = (FIXTURES / 'all-labs.html').read_text()
LABSTATUS = json.loads((FIXTURES / 'labstatus.json').read_text())


class ParseSections(unittest.TestCase):
    def test_reads_every_section_with_its_lab_ids(self):
        sections = dict(f.parse_sections(ALL_LABS))
        self.assertEqual(len(sections), 31)
        self.assertEqual(len(sections['os-command-injection']), 5)
        self.assertEqual(len(sections['prototype-pollution']), 10)
        self.assertEqual(sections['os-command-injection'][0],
                         '2b08de150e353dc1c0057519f466a55a0ca4a7901b2469d56ef7d2a80eddeaa6')


class ParseLabstatus(unittest.TestCase):
    def test_reads_id_level_title_and_path(self):
        labs = [f.parse_labstatus(w['Html']) for w in LABSTATUS]
        self.assertEqual(labs[-1], {
            'labId': 'ccfdc81094e272982bb5995e349d1fee4cb10179392ed6b49586fed5837006a0',
            'level': 0,
            'title': 'Basic clickjacking with CSRF token protection',
            'path': '/web-security/clickjacking/lab-basic-csrf-protected',
        })
        self.assertEqual(labs[-2]['level'], 2)
        self.assertEqual(labs[0]['level'], 1)

    def test_an_unreadable_widget_is_none_not_a_crash(self):
        odd = LABSTATUS[-1]['Html'].replace('APPRENTICE', 'GRANDMASTER')
        self.assertIsNone(f.parse_labstatus(odd))
        self.assertIsNone(f.parse_labstatus('<div>gone</div>'))


def lab(labId, path, level=1):
    return {'labId': labId, 'level': level, 'title': labId, 'path': path}


class BuildTopics(unittest.TestCase):
    def setUp(self):
        self.sections = [
            ('sql-injection', ['s1']),
            ('clickjacking', ['c1']),
            ('essential-skills', ['e1']),
            ('prototype-pollution', ['p1', 'p2', 'p3']),
            ('brand-new-topic', ['n1']),
        ]
        self.labs = {
            's1': lab('s1', '/web-security/sql-injection/lab-x'),
            'c1': lab('c1', '/web-security/clickjacking/lab-x', 0),
            'e1': lab('e1', '/web-security/essential-skills/lab-x'),
            'p1': lab('p1', '/web-security/prototype-pollution/client-side/lab-x'),
            'p2': lab('p2', '/web-security/prototype-pollution/server-side/lab-y', 2),
            'p3': lab('p3', '/web-security/prototype-pollution/lab-z'),
            'n1': lab('n1', '/web-security/brand-new-topic/lab-x'),
        }
        self.topics, self.warnings = f.build_topics(self.sections, self.labs)

    def test_maps_sections_to_direct_topic_ids(self):
        by_id = {t['id']: t for t in self.topics}
        self.assertEqual(sorted(by_id), [4, 100, 101])
        self.assertEqual(by_id[4], {'id': 4, 'name': 'Clickjacking', 'kind': 'direct',
                                    'labs': [self.labs['c1']]})

    def test_splits_prototype_pollution_by_path(self):
        by_id = {t['id']: t for t in self.topics}
        self.assertEqual([x['labId'] for x in by_id[100]['labs']], ['p1'])
        self.assertEqual([x['labId'] for x in by_id[101]['labs']], ['p2'])

    def test_skips_mystery_and_essential_skills_sections(self):
        names = {t['name'] for t in self.topics}
        self.assertFalse(names & {'SQL injection', 'Essential skills'})

    def test_reports_unknown_sections_and_unclassified_labs(self):
        joined = '\n'.join(self.warnings)
        self.assertIn('brand-new-topic', joined)
        self.assertIn('p3', joined)
        self.assertEqual(len(self.warnings), 2)

    def test_reports_labs_missing_from_labstatus(self):
        del self.labs['c1']
        _, warnings = f.build_topics(self.sections, self.labs)
        self.assertTrue(any('c1' in w for w in warnings))


class DataFile(unittest.TestCase):
    def test_rewriting_the_committed_file_changes_nothing(self):
        text = f.DATA_FILE.read_text()
        self.assertEqual(f.format_data(*f.read_data(text)), text)

    def test_merge_replaces_direct_topics_and_keeps_mystery_ones(self):
        data = {'fetched': 'old', 'groups': [], 'categories': [
            {'id': 1, 'name': 'SQL injection', 'levels': [1]},
            {'id': 10, 'name': 'Old', 'kind': 'direct', 'labs': []},
        ]}
        new = [{'id': 4, 'name': 'Clickjacking', 'kind': 'direct', 'labs': []}]
        merged = f.merge(data, new, '2026-11-16')
        self.assertEqual([c['id'] for c in merged['categories']], [1, 4])
        self.assertEqual(merged['directFetched'], '2026-11-16')
        self.assertEqual(merged['fetched'], 'old')

    def test_merge_refuses_a_direct_id_that_is_already_a_mystery_category(self):
        data = {'fetched': 'old', 'groups': [], 'categories': [
            {'id': 4, 'name': 'Clickjacking', 'levels': [0]},
        ]}
        new = [{'id': 4, 'name': 'Clickjacking', 'kind': 'direct', 'labs': []}]
        with self.assertRaises(ValueError):
            f.merge(data, new, '2026-11-16')


if __name__ == '__main__':
    unittest.main()
