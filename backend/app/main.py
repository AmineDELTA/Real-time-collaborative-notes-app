from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, user, space, block, user_in_space
from app.routers import websocket

app = FastAPI(title="App_API", version="1.0.0")

# Updated CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add both
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(user.router, prefix="/users", tags=["users"])
app.include_router(space.router, prefix="/spaces", tags=["spaces"])
app.include_router(block.router, prefix="/blocks", tags=["blocks"])
app.include_router(user_in_space.router, prefix="/user-in-space", tags=["user-in-space"])
app.include_router(websocket.router)