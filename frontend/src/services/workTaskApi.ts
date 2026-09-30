import api from "./api";

// =====================================================
// TYPES
// =====================================================

export type WorkTaskPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Urgent";

export type WorkTaskStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Overdue";

export type WorkTask = {
  id: number;

  title: string;
  description: string | null;

  assigned_to_id: number;
  created_by_id: number;

  priority: WorkTaskPriority;
  status: WorkTaskStatus;

  due_at: string | null;

  location: string | null;
  instructions: string | null;

  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;

  created_at: string;
  updated_at: string;
};


// =====================================================
// REQUEST TYPES
// =====================================================

export type CreateWorkTaskPayload = {
  title: string;
  description?: string;
  assigned_to_id: number;
  priority: WorkTaskPriority;
  due_at?: string | null;
  location?: string;
  instructions?: string;
};

export type UpdateWorkTaskPayload = {
  title?: string;
  description?: string;
  assigned_to_id?: number;
  priority?: WorkTaskPriority;
  due_at?: string | null;
  location?: string;
  instructions?: string;
};


// =====================================================
// ADMIN — GET ALL WORK TASKS
// =====================================================

export async function getWorkTasks(): Promise<WorkTask[]> {
  const response = await api.get<WorkTask[]>(
    "/work-tasks",
  );

  return response.data;
}


// =====================================================
// CURRENT USER — GET MY WORK TASKS
// =====================================================

export async function getMyWorkTasks(): Promise<WorkTask[]> {
  const response = await api.get<WorkTask[]>(
    "/work-tasks/my",
  );

  return response.data;
}


// =====================================================
// GET SINGLE WORK TASK
// =====================================================

export async function getWorkTask(
  taskId: number,
): Promise<WorkTask> {
  const response = await api.get<WorkTask>(
    `/work-tasks/${taskId}`,
  );

  return response.data;
}


// =====================================================
// ADMIN — CREATE WORK TASK
// =====================================================

export async function createWorkTask(
  payload: CreateWorkTaskPayload,
): Promise<WorkTask> {
  const response = await api.post<WorkTask>(
    "/work-tasks",
    payload,
  );

  return response.data;
}


// =====================================================
// ADMIN — UPDATE WORK TASK
// =====================================================

export async function updateWorkTask(
  taskId: number,
  payload: UpdateWorkTaskPayload,
): Promise<WorkTask> {
  const response = await api.put<WorkTask>(
    `/work-tasks/${taskId}`,
    payload,
  );

  return response.data;
}


// =====================================================
// STAFF — START WORK TASK
// =====================================================

export async function startWorkTask(
  taskId: number,
): Promise<WorkTask> {
  const response = await api.post<WorkTask>(
    `/work-tasks/${taskId}/start`,
  );

  return response.data;
}


// =====================================================
// STAFF — COMPLETE WORK TASK
// =====================================================

export async function completeWorkTask(
  taskId: number,
): Promise<WorkTask> {
  const response = await api.post<WorkTask>(
    `/work-tasks/${taskId}/complete`,
  );

  return response.data;
}


// =====================================================
// ADMIN — CANCEL WORK TASK
// =====================================================

export async function cancelWorkTask(
  taskId: number,
): Promise<WorkTask> {
  const response = await api.post<WorkTask>(
    `/work-tasks/${taskId}/cancel`,
  );

  return response.data;
}