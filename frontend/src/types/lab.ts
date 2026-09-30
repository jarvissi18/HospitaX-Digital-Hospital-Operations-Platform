// =====================================================
// HOSPITAX — LAB TYPES
// Frontend contract for the Laboratory module.
// Matches the current FastAPI Laboratory schemas.
// =====================================================

// =====================================================
// ENUM-LIKE TYPES
// =====================================================

export type LabTestResultType =
  | "Numeric"
  | "Text"
  | "Positive/Negative"
  | "Qualitative";

export type LabOrderPriority =
  | "Routine"
  | "Urgent"
  | "STAT";

export type LabOrderStatus =
  | "ORDERED"
  | "SAMPLE_PENDING"
  | "COLLECTED"
  | "PROCESSING"
  | "RESULT_ENTERED"
  | "TECHNICALLY_VALIDATED"
  | "DOCTOR_REVIEW"
  | "FINALIZED"
  | "CANCELLED"
  | "REJECTED";

export type LabOrderItemStatus = LabOrderStatus;

export type LabSampleStatus =
  | "Pending"
  | "Collected"
  | "Received"
  | "Rejected"
  | "Processed";

export type LabResultStatus =
  | "RESULT_ENTERED"
  | "TECHNICALLY_VALIDATED"
  | "DOCTOR_REVIEW"
  | "FINALIZED";

export type LabAbnormalFlag =
  | "Normal"
  | "Low"
  | "High"
  | "Critical"
  | "Positive"
  | "Negative";

// =====================================================
// LAB TEST
// =====================================================

export interface LabTest {
  id: number;
  code: string;
  name: string;
  category: string;
  specimen_type: string;
  result_type: LabTestResultType;
  unit: string | null;
  reference_range_text: string | null;
  reference_min: number | null;
  reference_max: number | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateLabTestPayload {
  code: string;
  name: string;
  category: string;
  specimen_type: string;
  result_type?: LabTestResultType;
  unit?: string | null;
  reference_range_text?: string | null;
  reference_min?: number | null;
  reference_max?: number | null;
  is_active?: boolean;
  description?: string | null;
}

export interface UpdateLabTestPayload {
  code?: string;
  name?: string;
  category?: string;
  specimen_type?: string;
  result_type?: LabTestResultType;
  unit?: string | null;
  reference_range_text?: string | null;
  reference_min?: number | null;
  reference_max?: number | null;
  is_active?: boolean;
  description?: string | null;
}

// =====================================================
// LAB ORDER ITEM
// =====================================================

export interface LabOrderItem {
  id: number;
  lab_order_id: number;
  lab_test_id: number;
  status: LabOrderItemStatus;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateLabOrderItemPayload {
  lab_test_id: number;
  notes?: string | null;
}

// =====================================================
// LAB ORDER
// =====================================================

export interface LabOrder {
  id: number;
  patient_id: number;
  encounter_id: number;
  ordered_by_id: number;
  priority: LabOrderPriority;
  status: LabOrderStatus;
  clinical_indication: string | null;
  notes: string | null;
  ordered_at: string;
  updated_at: string | null;
  cancelled_at: string | null;
  finalized_at: string | null;
  items: LabOrderItem[];
}

export interface CreateLabOrderPayload {
  patient_id: number;
  encounter_id: number;
  priority?: LabOrderPriority;
  clinical_indication?: string | null;
  notes?: string | null;
  items: CreateLabOrderItemPayload[];
}

export interface UpdateLabOrderPayload {
  priority?: LabOrderPriority;
  clinical_indication?: string | null;
  notes?: string | null;
}

// =====================================================
// LAB SAMPLE
// =====================================================

export interface LabSample {
  id: number;
  lab_order_id: number;
  sample_code: string;
  specimen_type: string;
  status: LabSampleStatus;
  collected_by_id: number | null;
  collected_at: string | null;
  received_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateLabSamplePayload {
  specimen_type: string;
  notes?: string | null;
}

export interface CollectLabSamplePayload {
  notes?: string | null;
}

export interface ReceiveLabSamplePayload {
  notes?: string | null;
}

export interface RejectLabSamplePayload {
  rejection_reason: string;
  notes?: string | null;
}

// =====================================================
// LAB RESULT
// =====================================================

export interface LabResult {
  id: number;
  lab_order_item_id: number;
  status: LabResultStatus;

  numeric_value: number | null;
  text_value: string | null;

  unit: string | null;

  reference_range_text: string | null;
  reference_min: number | null;
  reference_max: number | null;

  abnormal_flag: LabAbnormalFlag | null;
  is_critical: boolean;

  interpretation: string | null;
  result_notes: string | null;

  entered_by_id: number | null;
  entered_at: string | null;

  validated_by_id: number | null;
  validated_at: string | null;
  validation_notes: string | null;

  reviewed_by_id: number | null;
  reviewed_at: string | null;
  review_notes: string | null;

  finalized_at: string | null;

  created_at: string;
  updated_at: string | null;
}

// =====================================================
// CREATE LAB RESULT
// =====================================================

export interface CreateLabResultPayload {
  /**
   * Required by the current backend validation contract.
   * Identifies the laboratory order item receiving the result.
   */
  lab_order_item_id: number;

  numeric_value?: number | null;
  text_value?: string | null;

  unit?: string | null;

  reference_range_text?: string | null;
  reference_min?: number | null;
  reference_max?: number | null;

  abnormal_flag?: LabAbnormalFlag | null;
  is_critical?: boolean;

  interpretation?: string | null;
  result_notes?: string | null;
}

// =====================================================
// UPDATE LAB RESULT
// =====================================================

export interface UpdateLabResultPayload {
  numeric_value?: number | null;
  text_value?: string | null;

  unit?: string | null;

  reference_range_text?: string | null;
  reference_min?: number | null;
  reference_max?: number | null;

  abnormal_flag?: LabAbnormalFlag | null;
  is_critical?: boolean;

  interpretation?: string | null;
  result_notes?: string | null;
}

// =====================================================
// RESULT LIFECYCLE PAYLOADS
// =====================================================

export interface ValidateLabResultPayload {
  validation_notes?: string | null;
}

export interface ReviewLabResultPayload {
  review_notes?: string | null;
}

export interface FinalizeLabResultPayload {
  review_notes?: string | null;
}

// =====================================================
// PATIENT LAB HISTORY
// Backend currently returns LabOrder objects here.
// Alias kept explicit so the service layer remains clear.
// =====================================================

export type PatientLabHistoryItem = LabOrder;