from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.app.api.routes import router
from backend.app.core.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CR Geospatial Intelligence", version="0.1.0")
app.include_router(router)
app.mount("/app", StaticFiles(directory="frontend", html=True), name="frontend")
