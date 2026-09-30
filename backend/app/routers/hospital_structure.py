from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth.dependencies import get_current_user
from app.database import get_db


router = APIRouter(
    prefix="/hospital-structure",
    tags=["Hospital Structure"],
)


# =====================================================
# ADMIN AUTHORIZATION
# =====================================================


def admin_required(
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )

    return current_user


# =====================================================
# DEPARTMENTS
# =====================================================


@router.get(
    "/departments",
    response_model=List[schemas.DepartmentResponse],
)
def get_departments(
    db: Session = Depends(get_db),
):
    return crud.get_departments(db)


@router.post(
    "/departments",
    response_model=schemas.DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    department: schemas.DepartmentCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.create_department(
        db,
        department,
    )

    if result == "name_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A department with this name already exists.",
        )

    if result == "code_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A department with this code already exists.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department already exists.",
        )

    return result


@router.put(
    "/departments/{department_id}",
    response_model=schemas.DepartmentResponse,
)
def update_department(
    department_id: int,
    department: schemas.DepartmentUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.update_department(
        db,
        department_id,
        department,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )

    if result == "name_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A department with this name already exists.",
        )

    if result == "code_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A department with this code already exists.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department already exists.",
        )

    return result


@router.delete(
    "/departments/{department_id}",
)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.delete_department(
        db,
        department_id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )

    if result == "has_dependencies":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This department cannot be deleted because "
                "it contains floors. Remove or reassign them first."
            ),
        )

    return {
        "message": "Department deleted successfully.",
    }


# =====================================================
# FLOORS
# =====================================================


@router.get(
    "/floors",
    response_model=List[schemas.FloorResponse],
)
def get_floors(
    db: Session = Depends(get_db),
):
    return crud.get_floors(db)


@router.post(
    "/floors",
    response_model=schemas.FloorResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_floor(
    floor: schemas.FloorCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.create_floor(
        db,
        floor,
    )

    if result == "department_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Floor could not be created because of a duplicate record.",
        )

    return result


@router.put(
    "/floors/{floor_id}",
    response_model=schemas.FloorResponse,
)
def update_floor(
    floor_id: int,
    floor: schemas.FloorUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.update_floor(
        db,
        floor_id,
        floor,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Floor not found.",
        )

    if result == "department_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Floor could not be updated because of a duplicate record.",
        )

    return result


@router.delete(
    "/floors/{floor_id}",
)
def delete_floor(
    floor_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.delete_floor(
        db,
        floor_id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Floor not found.",
        )

    if result == "has_dependencies":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This floor cannot be deleted because "
                "it contains wards. Remove or reassign them first."
            ),
        )

    return {
        "message": "Floor deleted successfully.",
    }


# =====================================================
# WARDS
# =====================================================


@router.get(
    "/wards",
    response_model=List[schemas.WardResponse],
)
def get_wards(
    db: Session = Depends(get_db),
):
    return crud.get_wards(db)


@router.post(
    "/wards",
    response_model=schemas.WardResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_ward(
    ward: schemas.WardCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.create_ward(
        db,
        ward,
    )

    if result == "floor_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Floor not found.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ward could not be created because of a duplicate record.",
        )

    return result


@router.put(
    "/wards/{ward_id}",
    response_model=schemas.WardResponse,
)
def update_ward(
    ward_id: int,
    ward: schemas.WardUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.update_ward(
        db,
        ward_id,
        ward,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ward not found.",
        )

    if result == "floor_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Floor not found.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ward could not be updated because of a duplicate record.",
        )

    return result


@router.delete(
    "/wards/{ward_id}",
)
def delete_ward(
    ward_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.delete_ward(
        db,
        ward_id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ward not found.",
        )

    if result == "has_dependencies":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This ward cannot be deleted because "
                "it contains rooms. Remove or reassign them first."
            ),
        )

    return {
        "message": "Ward deleted successfully.",
    }


# =====================================================
# ROOMS
# =====================================================


@router.get(
    "/rooms",
    response_model=List[schemas.RoomResponse],
)
def get_rooms(
    db: Session = Depends(get_db),
):
    return crud.get_rooms(db)


@router.post(
    "/rooms",
    response_model=schemas.RoomResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_room(
    room: schemas.RoomCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.create_room(
        db,
        room,
    )

    if result == "ward_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ward not found.",
        )

    if result == "room_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A room with this room number already exists "
                "in this ward."
            ),
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room could not be created because of a duplicate record.",
        )

    return result


@router.put(
    "/rooms/{room_id}",
    response_model=schemas.RoomResponse,
)
def update_room(
    room_id: int,
    room: schemas.RoomUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.update_room(
        db,
        room_id,
        room,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )

    if result == "ward_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ward not found.",
        )

    if result == "room_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A room with this room number already exists "
                "in this ward."
            ),
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room could not be updated because of a duplicate record.",
        )

    return result


@router.delete(
    "/rooms/{room_id}",
)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.delete_room(
        db,
        room_id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )

    if result == "has_dependencies":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This room cannot be deleted because "
                "it contains beds. Remove or reassign them first."
            ),
        )

    return {
        "message": "Room deleted successfully.",
    }


# =====================================================
# BEDS
# =====================================================


@router.get(
    "/beds",
    response_model=List[schemas.BedResponse],
)
def get_beds(
    db: Session = Depends(get_db),
):
    return crud.get_beds(db)


@router.post(
    "/beds",
    response_model=schemas.BedResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_bed(
    bed: schemas.BedCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.create_bed(
        db,
        bed,
    )

    if result == "room_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )

    if result == "bed_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A bed with this bed number already exists "
                "in this room."
            ),
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bed could not be created because of a duplicate record.",
        )

    return result


@router.put(
    "/beds/{bed_id}",
    response_model=schemas.BedResponse,
)
def update_bed(
    bed_id: int,
    bed: schemas.BedUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.update_bed(
        db,
        bed_id,
        bed,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bed not found.",
        )

    if result == "room_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )

    if result == "bed_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A bed with this bed number already exists "
                "in this room."
            ),
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bed could not be updated because of a duplicate record.",
        )

    return result


@router.delete(
    "/beds/{bed_id}",
)
def delete_bed(
    bed_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.delete_bed(
        db,
        bed_id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bed not found.",
        )

    return {
        "message": "Bed deleted successfully.",
    }