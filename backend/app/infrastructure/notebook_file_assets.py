from __future__ import annotations

import mimetypes
import shutil
from pathlib import Path

from app.domain.notebook import InvalidNotebookAssetError, InvalidTreeStructureError, NotebookAsset, NotebookAssetNotFoundError, NotebookUpload

class NotebookFileAssetMixin:
    def _safe_note_file_path(self, notebook_path: Path, filename: str) -> Path:
        note_root = (notebook_path / "note").resolve(strict=False)
        try:
            file_path = (note_root / self._normalize_segment_name(filename)).resolve(strict=False)
            file_path.relative_to(note_root)
        except ValueError as error:
            raise InvalidTreeStructureError("Node text file path is invalid.") from error
        if file_path.parent != note_root:
            raise InvalidTreeStructureError("Node text file path is invalid.")
        return file_path

    def _safe_resource_dir_path(self, notebook_path: Path, relative_dir: str, kind: str) -> Path:
        resource_root = (notebook_path / kind).resolve(strict=False)
        candidate = ((notebook_path / "note") / relative_dir).resolve(strict=False)
        try:
            candidate.relative_to(resource_root)
        except ValueError as error:
            raise InvalidTreeStructureError("Node resource path is invalid.") from error
        return candidate

    def _safe_asset_file_path(self, directory: Path, filename: str) -> Path:
        try:
            asset_name = self._normalize_segment_name(filename)
            asset_path = (directory / asset_name).resolve(strict=False)
            asset_path.relative_to(directory.resolve(strict=False))
        except ValueError as error:
            raise NotebookAssetNotFoundError(filename) from error
        if asset_path.parent != directory.resolve(strict=False):
            raise NotebookAssetNotFoundError(filename)
        return asset_path

    def _normalize_uploads(
        self,
        uploads: list[NotebookUpload],
        allowed_extensions: set[str],
    ) -> list[NotebookUpload]:
        normalized_uploads: list[NotebookUpload] = []
        seen_names: set[str] = set()
        for upload in uploads:
            try:
                filename = self._normalize_segment_name(upload.filename)
            except ValueError as error:
                raise InvalidNotebookAssetError(upload.filename) from error
            if Path(filename).suffix.lower() not in allowed_extensions:
                raise InvalidNotebookAssetError(filename)
            folded_name = filename.casefold()
            if folded_name in seen_names:
                raise InvalidNotebookAssetError(filename)
            seen_names.add(folded_name)
            normalized_uploads.append(
                NotebookUpload(
                    filename=filename,
                    content=upload.content,
                    media_type=upload.media_type,
                )
            )
        return normalized_uploads

    def _write_uploads(self, directory: Path, uploads: list[NotebookUpload]) -> None:
        for upload in uploads:
            asset_path = self._safe_asset_file_path(directory, upload.filename)
            asset_path.write_bytes(upload.content)

    def _cleanup_created_node_files(self, note_path: Path, image_dir: Path, voice_dir: Path) -> None:
        if note_path.exists():
            note_path.unlink()
        for directory in (image_dir, voice_dir):
            if directory.exists():
                shutil.rmtree(directory)

    def _list_assets(
        self,
        notebook_name: str,
        directory: Path,
        kind: str,
        allowed_extensions: set[str],
    ) -> list[NotebookAsset]:
        if not directory.is_dir():
            return []
        return [
            NotebookAsset(
                name=asset.name,
                display_path=f"notes/{notebook_name}/{kind}/{directory.name}/{asset.name}",
                media_type=mimetypes.guess_type(asset.name)[0] or "application/octet-stream",
            )
            for asset in sorted(directory.iterdir(), key=lambda item: item.name.casefold())
            if asset.is_file() and asset.suffix.lower() in allowed_extensions
        ]
