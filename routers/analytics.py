from fastapi import APIRouter
import crud

router = APIRouter(prefix="/api/analytics", tags=["Analytics & KPIs"])

@router.get("/kpis")
def get_kpi_dashboard():
    return crud.get_dashboard_kpis()
