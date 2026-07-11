from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse

from app.application.auth_service import AuthService
from app.application.notebook_service import NotebookService
from app.core.config import AppConfig
from app.domain.auth import User
from app.domain.notebook import (
    DuplicateNodeNameError,
    DuplicateNotebookNameError,
    InvalidNodeNameError,
    InvalidNotebookAssetError,
    InvalidNotebookNameError,
    InvalidTreeStructureError,
    NodeNotFoundError,
    NotebookAssetNotFoundError,
    NotebookNotFoundError,
)
from app.interfaces.http.dependencies import get_auth_service, get_config, get_notebook_service
from app.interfaces.http.notebook_payloads import (
    node_detail_payload,
    node_payload,
    notebook_payload,
    tree_from_request,
    tree_payload,
)
from app.interfaces.http.notebook_schemas import NotebookRequest, ReplaceTreeRequest
from app.interfaces.http.notebook_uploads import node_create_payload_from_request


router = APIRouter(prefix="/api/notebooks", tags=["notebooks"])


@router.get("")
def list_notebooks(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    notebooks = notebook_service.list_notebooks()
    return {"notebooks": [notebook_payload(notebook) for notebook in notebooks]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_notebook(
    payload: NotebookRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    try:
        notebook = notebook_service.create_notebook(payload.name)
    except InvalidNotebookNameError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Notebook name is invalid.") from error
    except DuplicateNotebookNameError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Notebook name already exists.") from error
    return {"notebook": notebook_payload(notebook)}


@router.patch("/{name}")
def rename_notebook(
    name: str,
    payload: NotebookRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    try:
        notebook = notebook_service.rename_notebook(name, payload.name)
    except InvalidNotebookNameError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Notebook name is invalid.") from error
    except DuplicateNotebookNameError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Notebook name already exists.") from error
    except NotebookNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found.") from error
    return {"notebook": notebook_payload(notebook)}


@router.get("/{name}/tree")
def get_notebook_tree(
    name: str,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    try:
        tree = notebook_service.get_tree(name)
    except (InvalidNotebookNameError, NotebookNotFoundError) as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found.") from error
    return {"tree": tree_payload(tree)}


@router.get("/{name}/nodes/{node_id}/detail")
def get_node_detail(
    name: str,
    node_id: str,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    try:
        detail = notebook_service.get_node_detail(name, node_id)
    except NodeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.") from error
    except InvalidTreeStructureError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Notebook tree is invalid.") from error
    except (InvalidNotebookNameError, NotebookNotFoundError) as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found.") from error
    return {"detail": node_detail_payload(detail, name)}


@router.get("/{name}/nodes/{node_id}/assets/{asset_kind}/{filename}")
def get_node_asset(
    name: str,
    node_id: str,
    asset_kind: str,
    filename: str,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    try:
        asset = notebook_service.get_node_asset(name, node_id, asset_kind, filename)
    except (NodeNotFoundError, NotebookAssetNotFoundError) as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.") from error
    except InvalidTreeStructureError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Notebook tree is invalid.") from error
    except (InvalidNotebookNameError, NotebookNotFoundError) as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found.") from error
    return FileResponse(asset.path, media_type=asset.media_type, filename=filename)


@router.put("/{name}/tree")
def replace_notebook_tree(
    name: str,
    payload: ReplaceTreeRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    try:
        tree = notebook_service.replace_tree(name, tree_from_request(payload.tree))
    except InvalidTreeStructureError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Notebook tree is invalid.") from error
    except (InvalidNotebookNameError, NotebookNotFoundError) as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found.") from error
    return {"tree": tree_payload(tree)}


@router.post("/{name}/nodes", status_code=status.HTTP_201_CREATED)
async def create_node(
    name: str,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    notebook_service: NotebookService = Depends(get_notebook_service),
    config: AppConfig = Depends(get_config),
):
    current_user_or_401(request, auth_service, config)
    payload, images, voices = await node_create_payload_from_request(request)
    try:
        node, tree = notebook_service.create_node(name, payload.title, payload.parentId, payload.textContent, images, voices)
    except InvalidNodeNameError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Node title is invalid.") from error
    except InvalidNotebookAssetError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Node asset is invalid.") from error
    except DuplicateNodeNameError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Node title already exists.") from error
    except NodeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent node not found.") from error
    except (InvalidNotebookNameError, NotebookNotFoundError) as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found.") from error
    return {"node": node_payload(node), "tree": tree_payload(tree)}


def current_user_or_401(request: Request, auth_service: AuthService, config: AppConfig) -> User:
    user = auth_service.current_user(request.cookies.get(config.session_cookie_name))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    return user
