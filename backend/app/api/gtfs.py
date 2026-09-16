from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
router=APIRouter(prefix="/gtfs",tags=["gtfs"])
@router.get("/stops",response_class=PlainTextResponse)
def stops(): return "stop_id,stop_name,stop_lat,stop_lon\n1,Thrissur,10.5276,76.2144\n2,Mannuthy,10.545,76.247\n3,Angamaly,10.196,76.386\n4,Aluva,10.1076,76.3516\n5,Ernakulam,9.9816,76.2999\n"
