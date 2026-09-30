import api from "./api";

import type {
  Housekeeper,
  HousekeeperCreate,
  HousekeeperUpdate,
  RoomHousekeeperAssignment,
  RoomHousekeeperAssignmentCreate,
  RoomHousekeeperAssignmentUpdate,
} from "../types/housekeeper";

// =====================================================
// HOUSEKEEPERS
// =====================================================

/**
 * Get all housekeepers
 */
export const getHousekeepers = async (): Promise<Housekeeper[]> => {
  const response = await api.get("/housekeepers");

  return response.data;
};


/**
 * Get single housekeeper
 */
export const getHousekeeper = async (
  housekeeperId: number
): Promise<Housekeeper> => {
  const response = await api.get(
    `/housekeepers/${housekeeperId}`
  );

  return response.data;
};


/**
 * Create housekeeper
 */
export const createHousekeeper = async (
  data: HousekeeperCreate
): Promise<Housekeeper> => {
  const response = await api.post(
    "/housekeepers",
    data
  );

  return response.data;
};


/**
 * Update housekeeper
 */
export const updateHousekeeper = async (
  housekeeperId: number,
  data: HousekeeperUpdate
): Promise<Housekeeper> => {
  const response = await api.put(
    `/housekeepers/${housekeeperId}`,
    data
  );

  return response.data;
};


/**
 * Delete housekeeper
 */
export const deleteHousekeeper = async (
  housekeeperId: number
): Promise<void> => {
  await api.delete(
    `/housekeepers/${housekeeperId}`
  );
};


// =====================================================
// ROOM HOUSEKEEPER ASSIGNMENTS
// =====================================================

/**
 * Get all room-housekeeper assignments
 */
export const getAllAssignments = async (): Promise<
  RoomHousekeeperAssignment[]
> => {
  const response = await api.get(
    "/housekeepers/assignments/all"
  );

  return response.data;
};


/**
 * Get assignments of a specific housekeeper
 */
export const getHousekeeperAssignments = async (
  housekeeperId: number
): Promise<RoomHousekeeperAssignment[]> => {
  const response = await api.get(
    `/housekeepers/${housekeeperId}/assignments`
  );

  return response.data;
};


/**
 * Create room-housekeeper assignment
 */
export const createAssignment = async (
  data: RoomHousekeeperAssignmentCreate
): Promise<RoomHousekeeperAssignment> => {
  const response = await api.post(
    "/housekeepers/assignments",
    data
  );

  return response.data;
};


/**
 * Update room-housekeeper assignment
 */
export const updateAssignment = async (
  assignmentId: number,
  data: RoomHousekeeperAssignmentUpdate
): Promise<RoomHousekeeperAssignment> => {
  const response = await api.put(
    `/housekeepers/assignments/${assignmentId}`,
    data
  );

  return response.data;
};


/**
 * Delete room-housekeeper assignment
 */
export const deleteAssignment = async (
  assignmentId: number
): Promise<void> => {
  await api.delete(
    `/housekeepers/assignments/${assignmentId}`
  );
};