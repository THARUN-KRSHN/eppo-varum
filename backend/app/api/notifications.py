from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime,timedelta
router=APIRouter(prefix="/notifications",tags=["notifications"])
class Subscription(BaseModel): stop_id:str; route:str|None=None; advance_minutes:int=5
@router.post("/subscriptions")
def create(s:Subscription): return {"id":"demo-1","enabled":True,"subscription":s.model_dump()}
@router.post("/demo-trigger")
def demo(s:Subscription): return {"type":"SCHEDULED","title":"Bus arriving soon","message":"Ernakulam bus is scheduled at this stop in approximately 5 minutes.","scheduled_time":"07:20","demo":True}
