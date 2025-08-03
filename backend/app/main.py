from fastapi import FastAPI
from app.routers import auth, spaces, blocks 

app = FastAPI()