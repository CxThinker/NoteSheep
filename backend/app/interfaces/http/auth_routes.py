from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel

from app.application.auth_service import (
    AuthService,
    DuplicateUsernameError,
    InvalidCredentialsError,
    PasswordTooShortError,
)
from app.application.folder_service import FolderService
from app.core.config import AppConfig
from app.domain.auth import User
from app.interfaces.http.dependencies import get_auth_service, get_config, get_folder_service


router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthRequest(BaseModel):
    username: str
    password: str


def user_payload(user: User) -> dict[str, dict[str, int | str]]:
    return {"user": {"id": user.id, "username": user.username}}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    payload: AuthRequest,
    service: AuthService = Depends(get_auth_service),
    folder_service: FolderService = Depends(get_folder_service),
):
    try:
        user = service.register(payload.username, payload.password)
        folder_service.ensure_default_folder(user.id)
    except PasswordTooShortError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters.",
        ) from error
    except DuplicateUsernameError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already registered.",
        ) from error
    except InvalidCredentialsError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required.",
        ) from error
    return user_payload(user)


@router.post("/login")
def login(
    payload: AuthRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
    config: AppConfig = Depends(get_config),
):
    try:
        user, token = service.login(payload.username, payload.password)
    except InvalidCredentialsError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        ) from error

    response.set_cookie(
        config.session_cookie_name,
        token,
        httponly=True,
        secure=config.session_secure,
        samesite="lax",
        max_age=config.session_days * 24 * 60 * 60,
    )
    return user_payload(user)


@router.get("/me")
def me(
    request: Request,
    service: AuthService = Depends(get_auth_service),
    config: AppConfig = Depends(get_config),
):
    user = service.current_user(request.cookies.get(config.session_cookie_name))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    return user_payload(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
    config: AppConfig = Depends(get_config),
):
    service.logout(request.cookies.get(config.session_cookie_name))
    response.delete_cookie(config.session_cookie_name, samesite="lax")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
