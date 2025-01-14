import psycopg2

import os
import sys

parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

from danswer.configs.app_configs import POSTGRES_DB
from danswer.configs.app_configs import POSTGRES_HOST
from danswer.configs.app_configs import POSTGRES_PASSWORD
from danswer.configs.app_configs import POSTGRES_PORT
from danswer.configs.app_configs import POSTGRES_USER
from danswer.db.credentials import create_initial_public_credential


def wipe_all_rows(database: str) -> None:
    conn = psycopg2.connect(
        dbname=database,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
    )
    cur = conn.cursor()

    # Disable triggers to prevent foreign key constraints from being checked
    cur.execute("SET session_replication_role = 'replica';")

    # Fetch all table names in the current database
    cur.execute(
        """
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    """
    )

    tables = cur.fetchall()

    for table in tables:
        table_name = table[0]

        # Don't touch migration history
        if table_name == "alembic_version":
            continue

        print(f"Deleting all rows from {table_name}...")
        cur.execute(f'DELETE FROM "{table_name}"')

    # Re-enable triggers
    cur.execute("SET session_replication_role = 'origin';")

    conn.commit()
    cur.close()
    conn.close()
    print("Finished wiping all rows.")


if __name__ == "__main__":
    print("Cleaning up all Danswer tables")
    wipe_all_rows(POSTGRES_DB)
    create_initial_public_credential()
    print("To keep data consistent, it's best to wipe the document index as well.")
    print(
        "To be safe, it's best to restart the Danswer services (API Server and Background Tasks"
    )
