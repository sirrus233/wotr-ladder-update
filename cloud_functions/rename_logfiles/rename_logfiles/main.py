from dataclasses import dataclass
from http import HTTPStatus

import functions_framework
import google.auth
import googleapiclient.discovery
from flask import Request


@dataclass
class LogData:
    fileId: str  # noqa: N815
    newName: str  # noqa: N815


@functions_framework.http
def rename_logfiles(request: Request) -> tuple[str, int]:
    """HTTP Cloud Function.
    Args:
        request (flask.Request): The request object.
        <https://flask.palletsprojects.com/en/1.1.x/api/#incoming-request-data>
    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`
        <https://flask.palletsprojects.com/en/1.1.x/api/#flask.make_response>.
    """
    request_json = request.get_json(silent=True)

    # Handle any malformed requests that come from the client.

    if not request_json:
        return "Malformed request. Could not retrieve JSON.\n", HTTPStatus.BAD_REQUEST

    if "logData" not in request_json:
        return "Malformed request. Missing required param.\n", HTTPStatus.BAD_REQUEST

    # Parse the request into objects. Error if deserialization is invalid.

    try:
        log_data_bulk = [LogData(**data) for data in request_json["logData"]]
    except TypeError as e:
        return f"Malformed request. Invalid data: {e}\n", HTTPStatus.BAD_REQUEST

    # Now that there is valid data, create credentials and the service client.

    drive_scope = "https://www.googleapis.com/auth/drive"
    credentials, _ = google.auth.default(scopes=[drive_scope])
    service = googleapiclient.discovery.build("drive", "v3", credentials=credentials)

    # Update the files

    for data in log_data_bulk:
        update = {"name": data.newName}

        try:
            service.files().update(fileId=data.fileId, body=update).execute()
        except Exception as e:  # noqa: BLE001
            return f"Failed to rename file: {e}\n", HTTPStatus.INTERNAL_SERVER_ERROR

    # TODO Should probably respond here with aggregated errors from above

    return "Logfile rename complete.\n", HTTPStatus.OK
