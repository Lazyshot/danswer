# This file is purely for development use, not included in any builds
import requests
import os
import sys

parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)


from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.document_index.vespa.index import DOCUMENT_ID_ENDPOINT
from danswer.utils.logger import setup_logger

logger = setup_logger()


def wipe_vespa_index() -> None:
    params = {"selection": "true", "cluster": DOCUMENT_INDEX_NAME}
    response = requests.delete(DOCUMENT_ID_ENDPOINT, params=params)
    response.raise_for_status()


if __name__ == "__main__":
    wipe_vespa_index()
