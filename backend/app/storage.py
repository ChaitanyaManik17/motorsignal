from __future__ import annotations

import os
from datetime import datetime

from pymongo import MongoClient


class SessionStore:
    def __init__(self) -> None:
        uri = os.getenv("MONGO_URI")
        self.memory: list[dict] | None = [] if not uri else None
        self.collection = None
        if uri:
            client = MongoClient(uri, serverSelectionTimeoutMS=3000)
            self.collection = client[os.getenv("MONGO_DB", "motor_signal")]["sessions"]
            self.collection.create_index([("profile_id", 1), ("timestamp", -1)])

    def insert(self, session: dict) -> dict:
        if self.memory is not None:
            self.memory.append(session)
        else:
            self.collection.insert_one(session.copy())
        return session

    def list(self, profile_id: str, task_type: str | None = None) -> list[dict]:
        query = {"profile_id": profile_id}
        if task_type:
            query["task_type"] = task_type
        if self.memory is not None:
            found = [s for s in self.memory if s["profile_id"] == profile_id and (not task_type or s["task_type"] == task_type)]
            return sorted(found, key=lambda s: s["timestamp"])
        return list(self.collection.find(query, {"_id": 0}).sort("timestamp", 1))

    def clear_demo(self, profile_id: str) -> int:
        if self.memory is not None:
            original = len(self.memory)
            self.memory[:] = [s for s in self.memory if not (s["profile_id"] == profile_id and s.get("is_demo_data"))]
            return original - len(self.memory)
        return self.collection.delete_many({"profile_id": profile_id, "is_demo_data": True}).deleted_count


store = SessionStore()
