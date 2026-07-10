from dataclasses import dataclass


DEFAULT_FOLDER_NAME = "笔记本1"


@dataclass(frozen=True)
class Folder:
    id: int
    name: str
    sort_order: int
