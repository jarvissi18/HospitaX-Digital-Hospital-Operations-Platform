import api from "./api";

import type {
  Department,
  DepartmentCreate,
  DepartmentUpdate,
  Floor,
  FloorCreate,
  FloorUpdate,
  Ward,
  WardCreate,
  WardUpdate,
  Room,
  RoomCreate,
  RoomUpdate,
  Bed,
  BedCreate,
  BedUpdate,
} from "../types/hospitalStructure";

/*
|--------------------------------------------------------------------------
| Hospital Structure API
|--------------------------------------------------------------------------
| Backend prefix:
| /hospital-structure
|
| Departments
| Floors
| Wards
| Rooms
| Beds
|--------------------------------------------------------------------------
*/

const BASE_URL = "/hospital-structure";


// =====================================================
// DEPARTMENTS
// =====================================================

export const getDepartments = async (): Promise<Department[]> => {
  const response = await api.get(
    `${BASE_URL}/departments`
  );

  return response.data;
};


export const getDepartment = async (
  id: number
): Promise<Department> => {
  const response = await api.get(
    `${BASE_URL}/departments/${id}`
  );

  return response.data;
};


export const createDepartment = async (
  data: DepartmentCreate
): Promise<Department> => {
  const response = await api.post(
    `${BASE_URL}/departments`,
    data
  );

  return response.data;
};


export const updateDepartment = async (
  id: number,
  data: DepartmentUpdate
): Promise<Department> => {
  const response = await api.put(
    `${BASE_URL}/departments/${id}`,
    data
  );

  return response.data;
};


export const deleteDepartment = async (
  id: number
): Promise<void> => {
  await api.delete(
    `${BASE_URL}/departments/${id}`
  );
};


// =====================================================
// FLOORS
// =====================================================

export const getFloors = async (): Promise<Floor[]> => {
  const response = await api.get(
    `${BASE_URL}/floors`
  );

  return response.data;
};


export const getFloor = async (
  id: number
): Promise<Floor> => {
  const response = await api.get(
    `${BASE_URL}/floors/${id}`
  );

  return response.data;
};


export const createFloor = async (
  data: FloorCreate
): Promise<Floor> => {
  const response = await api.post(
    `${BASE_URL}/floors`,
    data
  );

  return response.data;
};


export const updateFloor = async (
  id: number,
  data: FloorUpdate
): Promise<Floor> => {
  const response = await api.put(
    `${BASE_URL}/floors/${id}`,
    data
  );

  return response.data;
};


export const deleteFloor = async (
  id: number
): Promise<void> => {
  await api.delete(
    `${BASE_URL}/floors/${id}`
  );
};


// =====================================================
// WARDS
// =====================================================

export const getWards = async (): Promise<Ward[]> => {
  const response = await api.get(
    `${BASE_URL}/wards`
  );

  return response.data;
};


export const getWard = async (
  id: number
): Promise<Ward> => {
  const response = await api.get(
    `${BASE_URL}/wards/${id}`
  );

  return response.data;
};


export const createWard = async (
  data: WardCreate
): Promise<Ward> => {
  const response = await api.post(
    `${BASE_URL}/wards`,
    data
  );

  return response.data;
};


export const updateWard = async (
  id: number,
  data: WardUpdate
): Promise<Ward> => {
  const response = await api.put(
    `${BASE_URL}/wards/${id}`,
    data
  );

  return response.data;
};


export const deleteWard = async (
  id: number
): Promise<void> => {
  await api.delete(
    `${BASE_URL}/wards/${id}`
  );
};


// =====================================================
// ROOMS
// =====================================================

export const getRooms = async (): Promise<Room[]> => {
  const response = await api.get(
    `${BASE_URL}/rooms`
  );

  return response.data;
};


export const getRoom = async (
  id: number
): Promise<Room> => {
  const response = await api.get(
    `${BASE_URL}/rooms/${id}`
  );

  return response.data;
};


export const createRoom = async (
  data: RoomCreate
): Promise<Room> => {
  const response = await api.post(
    `${BASE_URL}/rooms`,
    data
  );

  return response.data;
};


export const updateRoom = async (
  id: number,
  data: RoomUpdate
): Promise<Room> => {
  const response = await api.put(
    `${BASE_URL}/rooms/${id}`,
    data
  );

  return response.data;
};


export const deleteRoom = async (
  id: number
): Promise<void> => {
  await api.delete(
    `${BASE_URL}/rooms/${id}`
  );
};


// =====================================================
// BEDS
// =====================================================

export const getBeds = async (): Promise<Bed[]> => {
  const response = await api.get(
    `${BASE_URL}/beds`
  );

  return response.data;
};


export const getBed = async (
  id: number
): Promise<Bed> => {
  const response = await api.get(
    `${BASE_URL}/beds/${id}`
  );

  return response.data;
};


export const createBed = async (
  data: BedCreate
): Promise<Bed> => {
  const response = await api.post(
    `${BASE_URL}/beds`,
    data
  );

  return response.data;
};


export const updateBed = async (
  id: number,
  data: BedUpdate
): Promise<Bed> => {
  const response = await api.put(
    `${BASE_URL}/beds/${id}`,
    data
  );

  return response.data;
};


export const deleteBed = async (
  id: number
): Promise<void> => {
  await api.delete(
    `${BASE_URL}/beds/${id}`
  );
};