from fastapi import FastAPI
from app.routers import auth, user, space, block, user_in_space
from app.routers import websocket

app = FastAPI(title="App_API", version="1.0.0")

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(space.router)
app.include_router(block.router)
app.include_router(user_in_space.router)
app.include_router(websocket.router)