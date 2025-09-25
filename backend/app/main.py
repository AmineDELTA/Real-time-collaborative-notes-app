from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, user, space, block, user_in_space
from app.routers import websocket

app = FastAPI(title="App_API", version="1.0.0")

# Updated CORS configuration with explicit methods and origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Type", "Content-Length"],
    max_age=600  # Cache preflight requests for 10 minutes
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(user.router, prefix="/users", tags=["users"])
app.include_router(space.router, prefix="/spaces", tags=["spaces"])
app.include_router(block.router, prefix="/blocks", tags=["blocks"])
app.include_router(user_in_space.router, prefix="/user-in-space", tags=["user-in-space"])
app.include_router(websocket.router)

# Add global exception handler to ensure CORS headers are included in error responses
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    from fastapi.responses import JSONResponse
    import traceback
    
    # Log the error for debugging
    traceback_str = ''.join(traceback.format_exception(None, exc, exc.__traceback__))
    print(f"Global exception handler caught: {traceback_str}")
    
    # Return a standardized response
    status_code = 500
    if hasattr(exc, "status_code"):
        status_code = exc.status_code
    
    response = JSONResponse(
        status_code=status_code,
        content={"detail": str(exc)},
    )
    
    # Manually add CORS headers to error responses
    origin = request.headers.get('origin')
    if origin and origin in ["http://localhost:3000"]:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response