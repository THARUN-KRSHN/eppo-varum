from fastapi import APIRouter
router=APIRouter(prefix="/timetables",tags=["timetables"])
@router.get("/{id}")
def get_timetable(id:str):
    return {"id":id,"status":"PUBLISHED","route":"Thrissur → Ernakulam","verified":True,"stops":[{"name":"Mannuthy","time":"06:28"},{"name":"Angamaly","time":"07:20"},{"name":"Aluva","time":"07:40"}]}
