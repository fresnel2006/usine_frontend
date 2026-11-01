"""Prépare la base de données en une seule commande.

Usage :
    python manage.py init_db                  # crée ce qui manque, ne supprime rien
    python manage.py init_db --reinitialiser  # supprime et recrée les 18 tables (données perdues)

Étapes :
1. crée la base indiquée dans DATABASE_URL si elle n'existe pas (PostgreSQL local) ;
2. exécute database/gestion_usine_supabase.sql si la table « equipe » est absente ;
3. remplace les empreintes d'exemple des comptes de test par de vraies empreintes bcrypt.
"""
import psycopg2
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from psycopg2 import sql

from usine.management.commands.seed_users import initialiser_comptes


def _parametres_connexion(base):
    reglages = settings.DATABASES["default"]
    return {
        "dbname": base,
        "user": reglages["USER"],
        "password": reglages["PASSWORD"],
        "host": reglages["HOST"],
        "port": reglages["PORT"],
        **reglages.get("OPTIONS", {}),
    }


class Command(BaseCommand):
    help = "Crée la base, les 18 tables, le jeu de données et les comptes de test si nécessaire."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reinitialiser",
            action="store_true",
            help="Supprime et recrée toutes les tables avec le jeu de données (les données saisies sont perdues).",
        )

    def handle(self, *args, reinitialiser=False, **options):
        self.creer_base_si_absente()
        self.creer_tables(reinitialiser)
        initialiser_comptes(seulement_empreintes_exemple=not reinitialiser, ecrire=self.stdout.write)
        self.stdout.write(self.style.SUCCESS("Base prête. Lancez : python manage.py runserver"))

    def creer_base_si_absente(self):
        base = settings.DATABASES["default"]["NAME"]
        if base == "postgres":
            return
        try:
            serveur = psycopg2.connect(**_parametres_connexion("postgres"))
        except (psycopg2.OperationalError, UnicodeDecodeError) as erreur:
            # Sous Windows, un refus en français provoque une UnicodeDecodeError au lieu du message.
            detail = erreur if isinstance(erreur, psycopg2.OperationalError) else "authentification refusée"
            reglages = settings.DATABASES["default"]
            raise CommandError(
                f"Connexion impossible à {reglages['HOST']}:{reglages['PORT']} avec l'utilisateur "
                f"« {reglages['USER']} » ({str(detail).strip()}).\n"
                "Vérifiez le mot de passe, l'hôte et le port de DATABASE_URL dans le fichier .env."
            )
        serveur.autocommit = True
        try:
            with serveur.cursor() as curseur:
                curseur.execute("SELECT 1 FROM pg_database WHERE datname = %s", [base])
                if curseur.fetchone():
                    self.stdout.write(f"Base « {base} » : déjà présente.")
                    return
                curseur.execute(sql.SQL("CREATE DATABASE {} ENCODING 'UTF8'").format(sql.Identifier(base)))
                self.stdout.write(f"Base « {base} » : créée.")
        except psycopg2.Error as erreur:
            self.stdout.write(f"Base « {base} » : création impossible ({str(erreur).strip()}).")
            self.stdout.write("Elle doit alors déjà exister chez l'hébergeur.")
        finally:
            serveur.close()

    def creer_tables(self, reinitialiser):
        deja = "equipe" in connection.introspection.table_names()
        if deja and not reinitialiser:
            self.stdout.write("Tables : déjà présentes, aucune modification.")
            return
        script = settings.SCRIPT_SQL.read_text(encoding="utf-8")
        with connection.cursor() as curseur:
            curseur.execute(script)
        self.stdout.write("Tables : 18 tables et jeu de données créés.")
