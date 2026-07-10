from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.datastructures import UploadFile

from app.application.auth_service import AuthService
from app.application.notebook_service import NotebookService
from app.core.config import AppConfig
from app.domain.auth import User
from app.domain.notebook import (
    DuplicateNodeNameError,
    DuplicateNotebookNameError,
    InvalidNodeNameError,
    InvalidNotebookNameError,
    InvalidNotebookAssetError,
    InvalidTreeStructureError,
    NotebookAsset,
    NotebookAssetNotFoundError,
    NodeNotFoundError,
    NotebookEntry,
    NotebookNodeDetail,
    NotebookNode,
    NotebookNotFoundError,
    NotebookTree,
    NotebookUpload,
    TreeEdge,
)
from app.interfaces.http.dependencies import get_auth_service, get_config, get_notebook_service


router = APIRouter(prefix="/api/notebooks", tags=["notebooks"])


class NotebookRequest(BaseModel):
    name: str


class NodeRequest(BaseModel):
    title: str
    parentId: str | None = None
    textContent: str = ""


class TreeNodeRequest(BaseModel):
    id: str
    title: str
    textFile: str
    voiceDir: str
    imgDir: str


class TreeEdgeRequest(BaseModel):
    from_id: str = Field(alias="from")
    to: str
    side: str = "right"
    order: int = 0


class TreeRequest(BaseModel):
    rootId: str | None = None
    nodes: list[TreeNodeRequest]
    edges: list[TreeEdgeRequest]


class ReplaceTreeRequest(BaseModel):
    tree: TreeRequest


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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notebook name is invalid.",
        ) from error
    except DuplicateNotebookNameError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Notebook name already exists.",
        ) from error
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notebook name is invalid.",
        ) from error
    except DuplicateNotebookNameError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Notebook name already exists.",
        ) from error
    except NotebookNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found.",
        ) from error
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found.",
        ) from error
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notebook tree is invalid.",
        ) from error
    except (InvalidNotebookNameError, NotebookNotFoundError) as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found.",
        ) from error
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notebook tree is invalid.",
        ) from error
    except (InvalidNotebookNameError, NotebookNotFoundError) as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found.",
        ) from error
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notebook tree is invalid.",
        ) from error
    except (InvalidNotebookNameError, NotebookNotFoundError) as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found.",
        ) from error
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
        node, tree = notebook_service.create_node(
            name,
            payload.title,
            payload.parentId,
            payload.textContent,
            images,
            voices,
        )
    except InvalidNodeNameError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Node title is invalid.",
        ) from error
    except InvalidNotebookAssetError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Node asset is invalid.",
        ) from error
    except DuplicateNodeNameError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Node title already exists.",
        ) from error
    except NodeNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parent node not found.",
        ) from error
    except (InvalidNotebookNameError, NotebookNotFoundError) as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found.",
        ) from error
    return {"node": node_payload(node), "tree": tree_payload(tree)}


async def node_create_payload_from_request(
    request: Request,
) -> tuple[NodeRequest, list[NotebookUpload], list[NotebookUpload]]:
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("multipart/form-data") or content_type.startswith("application/x-www-form-urlencoded"):
        form = await request.form()
        payload = NodeRequest(
            title=str(form.get("title") or ""),
            parentId=optional_form_value(form.get("parentId")),
            textContent=str(form.get("textContent") or ""),
        )
        images: list[NotebookUpload] = []
        voices: list[NotebookUpload] = []
        for key, value in form.multi_items():
            if not isinstance(value, UploadFile):
                continue
            if key == "images":
                images.append(await upload_from_file(value))
            elif key == "voices":
                voices.append(await upload_from_file(value))
        return payload, images, voices

    return NodeRequest.model_validate(await request.json()), [], []


def optional_form_value(value: object) -> str | None:
    if value is None:
        return None
    text = str(value)
    return text or None


async def upload_from_file(file: UploadFile) -> NotebookUpload:
    content = await file.read()
    return NotebookUpload(
        filename=file.filename or "",
        content=content,
        media_type=file.content_type or "application/octet-stream",
    )


def current_user_or_401(
    request: Request,
    auth_service: AuthService,
    config: AppConfig,
) -> User:
    user = auth_service.current_user(request.cookies.get(config.session_cookie_name))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    return user


def notebook_payload(notebook: NotebookEntry) -> dict[str, str]:
    return {"name": notebook.name}


def node_payload(node: NotebookNode) -> dict[str, str]:
    return {
        "id": node.id,
        "title": node.title,
        "textFile": node.text_file,
        "voiceDir": node.voice_dir,
        "imgDir": node.img_dir,
    }


def node_detail_payload(detail: NotebookNodeDetail, notebook_name: str) -> dict[str, object]:
    return {
        "node": node_payload(detail.node),
        "textPath": detail.text_path,
        "textContent": detail.text_content,
        "imagePath": detail.image_path,
        "images": [
            asset_payload(asset, notebook_name, detail.node.id, "images")
            for asset in detail.images
        ],
        "voicePath": detail.voice_path,
        "voices": [
            asset_payload(asset, notebook_name, detail.node.id, "voices")
            for asset in detail.voices
        ],
    }


def asset_payload(
    asset: NotebookAsset,
    notebook_name: str,
    node_id: str,
    asset_kind: str,
) -> dict[str, str]:
    return {
        "name": asset.name,
        "path": asset.display_path,
        "mediaType": asset.media_type,
        "url": (
            f"/api/notebooks/{quote(notebook_name, safe='')}/nodes/"
            f"{quote(node_id, safe='')}/assets/{asset_kind}/{quote(asset.name, safe='')}"
        ),
    }


def tree_from_request(tree: TreeRequest) -> NotebookTree:
    return NotebookTree(
        root_id=tree.rootId,
        nodes=[
            NotebookNode(
                id=node.id,
                title=node.title,
                text_file=node.textFile,
                voice_dir=node.voiceDir,
                img_dir=node.imgDir,
            )
            for node in tree.nodes
        ],
        edges=[
            TreeEdge(
                from_id=edge.from_id,
                to_id=edge.to,
                side=edge.side,
                order=edge.order,
            )
            for edge in tree.edges
        ],
    )


def tree_payload(tree: NotebookTree) -> dict[str, object]:
    return {
        "rootId": tree.root_id,
        "nodes": [node_payload(node) for node in tree.nodes],
        "edges": [
            {
                "from": edge.from_id,
                "to": edge.to_id,
                "side": edge.side,
                "order": edge.order,
            }
            for edge in tree.edges
        ],
    }
