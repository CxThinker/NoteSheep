from __future__ import annotations

from pydantic import BaseModel, Field


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
