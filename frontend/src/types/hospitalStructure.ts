// =====================================================
// HOSPITAL STRUCTURE TYPES
// =====================================================

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface DepartmentCreate {
  name: string;
  code: string;
  description?: string | null;
  is_active?: boolean;
}

export interface DepartmentUpdate {
  name?: string;
  code?: string;
  description?: string | null;
  is_active?: boolean;
}


// =====================================================
// FLOOR
// =====================================================

export interface Floor {
  id: number;
  name: string;
  floor_number: number;
  department_id: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface FloorCreate {
  name: string;
  floor_number: number;
  department_id: number;
  is_active?: boolean;
}

export interface FloorUpdate {
  name?: string;
  floor_number?: number;
  department_id?: number;
  is_active?: boolean;
}


// =====================================================
// WARD
// =====================================================

export interface Ward {
  id: number;
  name: string;
  ward_type: string;
  floor_id: number;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface WardCreate {
  name: string;
  ward_type: string;
  floor_id: number;
  description?: string | null;
  is_active?: boolean;
}

export interface WardUpdate {
  name?: string;
  ward_type?: string;
  floor_id?: number;
  description?: string | null;
  is_active?: boolean;
}


// =====================================================
// ROOM
// =====================================================

export interface Room {
  id: number;
  room_number: string;
  room_type: string;
  capacity: number;
  status: string;
  ward_id: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface RoomCreate {
  room_number: string;
  room_type: string;
  capacity: number;
  status?: string;
  ward_id: number;
  is_active?: boolean;
}

export interface RoomUpdate {
  room_number?: string;
  room_type?: string;
  capacity?: number;
  status?: string;
  ward_id?: number;
  is_active?: boolean;
}


// =====================================================
// BED
// =====================================================

export interface Bed {
  id: number;
  bed_number: string;
  bed_type: string;
  status: string;
  room_id: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface BedCreate {
  bed_number: string;
  bed_type?: string;
  status?: string;
  room_id: number;
  is_active?: boolean;
}

export interface BedUpdate {
  bed_number?: string;
  bed_type?: string;
  status?: string;
  room_id?: number;
  is_active?: boolean;
}