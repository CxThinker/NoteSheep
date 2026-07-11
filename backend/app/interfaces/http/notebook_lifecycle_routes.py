from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.application.auth_service import AuthService
from app.application.notebook_service import NotebookService
from app.core.config import AppConfig
from app.domain.notebook import DuplicateNotebookNameError, InvalidNotebookNameError, NotebookNotFoundError
from app.interfaces.http.dependencies import get_auth_service, get_config, get_notebook_service
from app.interfaces.http.notebook_payloads import deleted_notebook_payload, notebook_payload
from app.interfaces.http.notebook_routes import current_user_or_401

router = APIRouter(prefix="/api/notebooks", tags=["notebooks"])


@router.get("/deleted")
def list_deleted_notebooks(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    notebooks = notebook_service.list_deleted_notebooks()
    return {"notebooks": [deleted_notebook_payload(notebook) for notebook in notebooks]}


@router.delete("/{name}")
def delete_notebook(
    name: str,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    try:
        notebook = notebook_service.delete_notebook(name)
    except (InvalidNotebookNameError, NotebookNotFoundError) as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found.") from error
    return {"notebook": deleted_notebook_payload(notebook)}


@router.post("/deleted/{deleted_id}/restore")
def restore_deleted_notebook(
    deleted_id: str,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    try:
        notebook = notebook_service.restore_deleted_notebook(deleted_id)
    except DuplicateNotebookNameError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Notebook name already exists.") from error
    except NotebookNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deleted notebook not found.") from error
    return {"notebook": notebook_payload(notebook)}


@router.delete("/deleted/{deleted_id}", status_code=status.HTTP_204_NO_CONTENT)
def permanent_delete_notebook(
    deleted_id: str,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    try:
        notebook_service.permanent_delete_notebook(deleted_id)
    except NotebookNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deleted notebook not found.") from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
