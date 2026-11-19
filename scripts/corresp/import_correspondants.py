#!/usr/bin/env python3
"""Import the correspondants JSON into one DocDuDoc user account."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import uuid
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = Path(__file__).with_name("correspondants.json")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
NOTE_LIMIT = 2000


def text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def build_address(row: Mapping[str, Any]) -> str | None:
    street = ", ".join(
        part for part in (text(row.get("adresse")), text(row.get("complement"))) if part
    )
    city = " ".join(
        part for part in (text(row.get("cp")), text(row.get("ville"))) if part
    )
    address = ", ".join(part for part in (street, city) if part)
    return address or None


def build_phone(row: Mapping[str, Any]) -> str | None:
    phones: list[str] = []
    for field in ("telephone", "telephone_mobile", "telephone_autre"):
        phone = text(row.get(field))
        if phone and phone not in phones:
            phones.append(phone)
    return " / ".join(phones) or None


def build_notes(row: Mapping[str, Any], email_note: str | None) -> str | None:
    parts: list[str] = []
    comment = text(row.get("commentaire"))
    if comment:
        parts.append(comment)

    labels = (
        ("horaires", "Horaires"),
        ("fax", "Fax"),
        ("site", "Site"),
        ("mssante", "MSSanté"),
        ("adeli", "ADELI"),
        ("finess", "FINESS"),
        ("rpps", "RPPS"),
        ("type_pro", "Type professionnel"),
        ("categorie", "Catégorie"),
        ("civilite", "Civilité"),
        ("initiales", "Initiales"),
    )
    for field, label in labels:
        value = text(row.get(field))
        if value:
            parts.append(f"{label} : {value}")

    title = text(row.get("titre"))
    university_titles = text(row.get("titres_univ"))
    if title or university_titles:
        parts.append(
            "Titres : "
            + ", ".join(value for value in (title, university_titles) if value)
        )
    if email_note:
        parts.append(email_note)

    notes = "\n".join(parts)
    if len(notes) > NOTE_LIMIT:
        print(
            f"Avertissement : notes tronquées pour pro_id={row.get('pro_id')}.",
            file=sys.stderr,
        )
        notes = notes[:NOTE_LIMIT]
    return notes or None


def load_records(path: Path) -> list[dict[str, Any]]:
    try:
        with path.open(encoding="utf-8") as file:
            rows = json.load(file)
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Impossible de lire le fichier JSON {path}: {error}") from error

    if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
        raise ValueError("Le fichier JSON doit contenir une liste d’objets.")

    source_ids: set[str] = set()
    for index, row in enumerate(rows, start=1):
        source_id = str(row.get("pro_id", "")).strip()
        if not source_id:
            raise ValueError(f"La fiche {index} n’a pas de pro_id.")
        if source_id in source_ids:
            raise ValueError(f"Le pro_id {source_id} apparaît plusieurs fois.")
        source_ids.add(source_id)
        if not (text(row.get("display")) or text(row.get("nom"))):
            raise ValueError(f"La fiche pro_id={source_id} n’a pas de nom.")
    return rows


def prepare_records(
    rows: Sequence[Mapping[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    seen_emails: set[str] = set()
    stats = {"missing_email": 0, "invalid_email": 0, "duplicate_email": 0}
    records: list[dict[str, Any]] = []

    for row in rows:
        raw_email = text(row.get("email"))
        email: str | None = raw_email.lower() or None
        email_note: str | None = None

        if email is None:
            stats["missing_email"] += 1
        elif len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
            stats["invalid_email"] += 1
            email_note = f"E-mail source non valide : {raw_email}"
            email = None
        elif email in seen_emails:
            stats["duplicate_email"] += 1
            email_note = f"E-mail source partagé avec une autre fiche : {raw_email}"
            email = None
        else:
            seen_emails.add(email)

        name = text(row.get("display")) or " ".join(
            part
            for part in (
                text(row.get("titre")),
                text(row.get("prenom")),
                text(row.get("nom")),
            )
            if part
        )
        if len(name) > 120:
            raise ValueError(
                f"Le nom de la fiche pro_id={row.get('pro_id')} dépasse 120 caractères."
            )

        speciality = text(row.get("specialite")) or None
        if speciality and len(speciality) > 120:
            raise ValueError(
                f"La spécialité de la fiche pro_id={row.get('pro_id')} "
                "dépasse 120 caractères."
            )

        records.append(
            {
                "source_id": str(row["pro_id"]).strip(),
                "name": name,
                "email": email,
                "phone": build_phone(row),
                "address": build_address(row),
                "speciality": speciality,
                "patientslist": [],
                "notes": build_notes(row, email_note),
            }
        )

    return records, stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Importe les correspondants JSON dans le compte DocDuDoc indiqué."
    )
    parser.add_argument(
        "--user-email",
        required=True,
        help="Adresse e-mail du compte utilisateur destinataire.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT,
        help=f"Fichier JSON à importer (défaut : {DEFAULT_INPUT}).",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Effectue l’import. Sans cette option, affiche uniquement un aperçu.",
    )
    return parser.parse_args()


def import_records(
    database_url: str,
    user_email: str,
    records: Sequence[Mapping[str, Any]],
    apply: bool,
) -> tuple[int, int, int]:
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as error:
        raise RuntimeError(
            "Dépendance manquante. Installez-la avec "
            "`python -m pip install -r scripts/corresp/requirements.txt`."
        ) from error

    inserted = already_imported = email_conflicts = 0
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT "id", "email" FROM "user" WHERE lower("email") = lower(%s)',
                (user_email,),
            )
            users = cursor.fetchall()
            if len(users) != 1:
                raise ValueError(
                    f"Le compte {user_email!r} est introuvable ou n’est pas unique."
                )
            user_id = users[0]["id"]

            cursor.execute(
                'SELECT "sourceId", "email" FROM "correspondants" WHERE "userId" = %s',
                (user_id,),
            )
            existing = cursor.fetchall()
            existing_source_ids = {row["sourceId"] for row in existing if row["sourceId"]}
            existing_emails = {
                row["email"].lower() for row in existing if row["email"] is not None
            }
            known_source_ids = existing_source_ids.copy()
            available_emails = existing_emails.copy()

            if not apply:
                already_imported = sum(
                    record["source_id"] in existing_source_ids for record in records
                )
                email_conflicts = sum(
                    1
                    for record in records
                    if record["source_id"] not in existing_source_ids
                    and record["email"]
                    and record["email"].lower() in available_emails
                )
                print(f"Compte destinataire : {user_email}")
                print(f"Fiches dans le fichier : {len(records)}")
                print(f"Déjà importées : {already_imported}")
                print(f"Fiches prêtes à importer : {len(records) - already_imported}")
                print(f"E-mails déjà utilisés par ce compte : {email_conflicts}")
                print("Aucune donnée écrite. Ajouter --apply pour lancer l’import.")
                return 0, already_imported, email_conflicts

            with connection.transaction():
                for record in records:
                    source_id = record["source_id"]
                    if source_id in known_source_ids:
                        already_imported += 1
                        continue

                    email = record["email"]
                    notes = record["notes"]
                    if email and email.lower() in available_emails:
                        notes = build_notes(
                            {
                                "pro_id": source_id,
                                "commentaire": notes or "",
                            },
                            f"E-mail source déjà utilisé par ce compte : {email}",
                        )
                        email = None
                        email_conflicts += 1

                    cursor.execute(
                        """
                        INSERT INTO "correspondants"
                            ("id", "createdAt", "updatedAt", "name", "email",
                             "phone", "address", "speciality", "patientslist",
                             "notes", "userId", "sourceId")
                        VALUES (%s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, %s, %s,
                                %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                        RETURNING "id"
                        """,
                        (
                            str(uuid.uuid4()),
                            record["name"],
                            email,
                            record["phone"],
                            record["address"],
                            record["speciality"],
                            record["patientslist"],
                            notes,
                            user_id,
                            source_id,
                        ),
                    )
                    if cursor.fetchone() is None:
                        cursor.execute(
                            """
                            SELECT 1 FROM "correspondants"
                            WHERE "userId" = %s AND "sourceId" = %s
                            """,
                            (user_id, source_id),
                        )
                        if cursor.fetchone():
                            already_imported += 1
                            known_source_ids.add(source_id)
                            continue

                        if email is None:
                            raise RuntimeError(
                                f"Impossible d’insérer la fiche pro_id={source_id}."
                            )

                        notes = build_notes(
                            {"pro_id": source_id, "commentaire": notes or ""},
                            f"E-mail source déjà utilisé par ce compte : {email}",
                        )
                        cursor.execute(
                            """
                            INSERT INTO "correspondants"
                                ("id", "createdAt", "updatedAt", "name", "email",
                                 "phone", "address", "speciality", "patientslist",
                                 "notes", "userId", "sourceId")
                            VALUES (%s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, %s, NULL,
                                    %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT ("userId", "sourceId") DO NOTHING
                            RETURNING "id"
                            """,
                            (
                                str(uuid.uuid4()),
                                record["name"],
                                record["phone"],
                                record["address"],
                                record["speciality"],
                                record["patientslist"],
                                notes,
                                user_id,
                                source_id,
                            ),
                        )
                        if cursor.fetchone() is None:
                            already_imported += 1
                            known_source_ids.add(source_id)
                            continue
                        email_conflicts += 1

                    inserted += 1
                    known_source_ids.add(source_id)
                    if record["email"]:
                        available_emails.add(record["email"].lower())

    return inserted, already_imported, email_conflicts


def main() -> int:
    args = parse_args()
    try:
        from dotenv import load_dotenv

        load_dotenv(ROOT / ".env")
    except ImportError as error:
        print(
            "Dépendance manquante. Installez-la avec "
            "`python -m pip install -r scripts/corresp/requirements.txt`.",
            file=sys.stderr,
        )
        return 1

    try:
        import psycopg
    except ImportError:
        print(
            "Dépendance manquante. Installez-la avec "
            "`python -m pip install -r scripts/corresp/requirements.txt`.",
            file=sys.stderr,
        )
        return 1

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("La variable DATABASE_URL n’est pas définie.", file=sys.stderr)
        return 1

    try:
        records, stats = prepare_records(load_records(args.input))
        print(
            "Préparation : "
            f"{len(records)} fiche(s), {stats['missing_email']} sans e-mail, "
            f"{stats['invalid_email']} e-mail(s) invalide(s), "
            f"{stats['duplicate_email']} e-mail(s) en doublon."
        )

        inserted, already_imported, conflicts = import_records(
            database_url,
            args.user_email.strip(),
            records,
            args.apply,
        )
        if args.apply:
            print(
                f"Import terminé : {inserted} ajoutée(s), "
                f"{already_imported} déjà présente(s), "
                f"{conflicts} e-mail(s) mis à null pour conflit."
            )
    except (ValueError, RuntimeError) as error:
        print(f"Erreur : {error}", file=sys.stderr)
        return 1
    except psycopg.Error as error:
        print(f"Échec de l’import : {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
