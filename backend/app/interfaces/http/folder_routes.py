from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.application.auth_service import AuthService
from app.application.folder_service import FolderService
from app.core.config import AppConfig
from app.domain.auth import User
from app.domain.folder import Folder
from app.interfaces.http.dependencies import get_auth_service, get_config, get_folder_service


router = APIRouter(prefix="/api/folders", tags=["folders"])


@router.get("")
def list_folders(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    folder_service: FolderService = Depends(get_folder_service),
    config: AppConfig = Depends(get_config),
):
    user = current_user_or_401(request, auth_service, config)
    folders = folder_service.list_for_user(user.id)
    return {"folders": [folder_payload(folder) for folder in folders]}


def current_user_or_401(
    request: Request,
    auth_service: AuthService,
    config: AppConfig,
) -> User:
    user = auth_service.current_user(request.cookies.get(config.session_cookie_name))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    return user


def folder_payload(folder: Folder) -> dict[str, int | str]:
    return {"id": folder.id, "name": folder.name, "sortOrder": folder.sort_order}
