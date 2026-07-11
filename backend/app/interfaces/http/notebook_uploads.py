from __future__ import annotations

from fastapi import Request
from starlette.datastructures import UploadFile

from app.domain.notebook import NotebookUpload
from app.interfaces.http.notebook_schemas import NodeRequest


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
