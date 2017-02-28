from flask import Flask
from tba_py import BlueAllianceAPI

from server.data import DataServer
from server.db import Database
from server.stats import StatsServer
from server.receiver import ReceiverServer


class ClooneyServer(object):
    def __init__(self, name, config):
        self.app = Flask(name, static_folder='./server/static')
        self.config = config
        self.tba = BlueAllianceAPI('kestin_goforth', 'Clooney', '1.0', enable_caching=True, cache_db_path='./tba.json')
        self.db = Database()

        self._register_views()
        self.data_server = DataServer(self._add, "/api")
        self.stats_server = StatsServer(self._add, self.tba, "/api")
        self.recv_server = ReceiverServer(self._add, self.db, url_prefix="/api/data")

        self.run = self.app.run

    def _register_views(self):
        self._add('/settings/', self.settings)
        self._add('/', self.analysis)

    def _add(self, route: str, func: classmethod, methods=('GET',), url_prefix=""):
        self.app.add_url_rule(url_prefix + route, view_func=func, methods=methods)

    def analysis(self):
        return self.app.send_static_file('analysis/views/index.html')

    def settings(self):
        return self.app.send_static_file('settings/views/index.html')