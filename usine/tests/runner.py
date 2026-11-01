"""Lanceur de tests : la base de test reçoit le schéma et les données du script SQL.

Django crée une base « test_<nom> » vide (les modèles sont managed = False) ;
on y exécute database/gestion_usine_supabase.sql puis on hache les mots de passe de test.
Chaque test s'exécute dans une transaction annulée à la fin.
"""
from django.conf import settings
from django.db import connections
from django.test.runner import DiscoverRunner


class RunnerAvecSchema(DiscoverRunner):
    def setup_databases(self, **kwargs):
        anciennes = super().setup_databases(**kwargs)
        script = settings.SCRIPT_SQL.read_text(encoding="utf-8")
        with connections["default"].cursor() as curseur:
            curseur.execute(script)
        from usine.management.commands.seed_users import initialiser_comptes

        initialiser_comptes(ecrire=lambda *_: None)
        return anciennes
