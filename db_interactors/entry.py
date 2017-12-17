from models import ScoutingEntry


class EntryDatabaseInteractor:
    def __init__(self, db):
        self._db = db

        if 'entry' not in self._db.db.keys():
            self._db.db['entry'] = {'entry': [], 'max_id': -1}
        for key, value in (('entry', []), ('max_id', -1)):
            if key not in self._db.db['entry'].keys():
                self._db.db['entry'][key] = value

    def get_entries(self):
        return [ScoutingEntry.from_json(e) for e in self._db.db['entry']['entry']]

    def get_entry_by_id(self, id):
        entries = [e for e in self.get_entries() if e.id == id]
        return ScoutingEntry.from_json(entries[0]) if entries else None

    def remove_entry(self, id):
        entry = self.get_entry_by_id(id)
        if entry:
            self._db.db['entry']['entry'].remove(entry)

    def set_entry(self, entry):
        self.remove_entry(entry.id)
        self._db.db['entry']['entry'].append(entry.to_dict())

    def get_next_entry_id(self):
        self._db.db['entry']['max_id'] += 1
        return self._db.db['entry']['max_id']

    def get_entries_for_event(self, event_key):
        return [e for e in self.get_entries() if e.event == event_key]

