import hmac
import secrets
from hashlib import sha1

from models import User, UserSettings


class UserDatabaseInteractor:
    ROLES = ['Guest', 'User', 'Editor', 'Admin']

    def __init__(self, db, app):
        self._db = db
        self._app = app

        if 'users' not in self._db.db.keys():
            self._db.db['users'] = {'users': []}
        for key, value in (('users', []),):
            if key not in self._db.db['users'].keys():
                self._db.db['users'][key] = value
        if 'user_event_headers' not in self._db.db.keys():
            self._db.db['user_event_headers'] = {}

    def encrypt_password(self, pwd):
        hash = hmac.new(str(self._app.config['PASSWORD_KEY']).encode('UTF-8'), msg=str(pwd).encode('UTF-8'),
                        digestmod=sha1)
        return hash.hexdigest()

    def verify_password(self, pwd, hash):
        pwd = self.encrypt_password(pwd)
        return hmac.compare_digest(str(pwd).encode('UTF-8'), str(hash).encode('UTF-8'))

    def get_users(self):
        return self._db.db['users']['users']

    def get_user_by_id(self, user_id):
        user = [e for e in self.get_users() if e['id'] == user_id]
        return User.from_json(user[0]) if user else None

    def get_user_by_username(self, username):
        user = [e for e in self.get_users() if e['username'].lower() == username.lower()]
        return User.from_json(user[0]) if user else None

    def get_user_settings_by_user_username(self, username):
        if username in self._db.db['user_settings'].keys():
            return UserSettings.from_json(self._db.db['user_settings'][username])
        return None

    def set_user_settings(self, username, settings):
        self._db.db['user_settings'][username] = settings.to_dict()

    def add_user(self, user):
        user = user.to_dict()
        self.get_users().append(user)

    def remove_user(self, user_id):
        user = self.get_user_by_id(user_id)
        if user:
            self.get_users().remove(user)

    def update_user(self, user_id, user):
        old = self.get_user_by_id(user_id).to_dict()
        old.update(user.to_dict)
        self.get_users().remove(user)
        self.get_users().append(old)

    def get_next_user_id(self):
        existing_ids = [e['id'] for e in self._db.db['users']]
        new_id = secrets.randbits(32)
        while new_id in existing_ids:
            new_id = secrets.randbits(32)
        return new_id
