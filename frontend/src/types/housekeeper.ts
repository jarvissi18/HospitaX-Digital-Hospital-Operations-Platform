// =====================================================
// HOUSEKEEPER TYPES
// =====================================================

export interface Housekeeper {
  id: number;
  full_name: string;
  employee_code: string;
  phone: string;
  email?: string | null;
  status: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}


// =====================================================
// CREATE HOUSEKEEPER
// =====================================================

export interface HousekeeperCreate {
  full_name: string;
  employee_code: string;
  phone: string;
  email?: string | null;
  status?: string;
  notes?: string | null;
}


// =====================================================
// UPDATE HOUSEKEEPER
// =====================================================

export interface HousekeeperUpdate {
  full_name?: string;
  employee_code?: string;
  phone?: string;
  email?: string | null;
  status?: string;
  notes?: string | null;
}


// =====================================================
// ROOM HOUSEKEEPER ASSIGNMENT
// =====================================================

export interface RoomHousekeeperAssignment {
  id: number;
  housekeeper_id: number;
  room_id: number;
  assignment_status: string;
  responsibilities?: string | null;
  notes?: string | null;
  assigned_at?: string;
  updated_at?: string;
}


// =====================================================
// CREATE ASSIGNMENT
// =====================================================

export interface RoomHousekeeperAssignmentCreate {
  housekeeper_id: number;
  room_id: number;
  assignment_status?: string;
  responsibilities?: string | null;
  notes?: string | null;
}


// =====================================================
// UPDATE ASSIGNMENT
// =====================================================

export interface RoomHousekeeperAssignmentUpdate {
  assignment_status?: string;
  responsibilities?: string | null;
  notes?: string | null;
}