from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes import admin, analytics, attendance, auth, employees, leaves

app = FastAPI(
    title="HRMS Lite API",
    description="Human Resource Management System API with auth, attendance, leaves, and analytics",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(leaves.router)
app.include_router(analytics.router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {"message": "HRMS Lite API", "docs": "/docs", "version": "2.0.0"}
