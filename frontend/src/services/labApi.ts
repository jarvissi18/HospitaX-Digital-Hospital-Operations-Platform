import api from "./api";

import type {
  CreateLabOrderPayload,
  CreateLabResultPayload,
  CreateLabSamplePayload,
  CreateLabTestPayload,
  LabOrder,
  LabOrderItem,
  LabOrderStatus,
  LabResult,
  LabSample,
  LabTest,
  PatientLabHistoryItem,
  UpdateLabOrderPayload,
  UpdateLabResultPayload,
  UpdateLabTestPayload,
  ValidateLabResultPayload,
  ReviewLabResultPayload,
  FinalizeLabResultPayload,
  CollectLabSamplePayload,
  ReceiveLabSamplePayload,
  RejectLabSamplePayload,
} from "../types/lab";

// =====================================================
// LAB TEST CATALOG
// =====================================================

export async function getLabTests(
  activeOnly: boolean = true,
): Promise<LabTest[]> {
  const response = await api.get<LabTest[]>("/lab/tests", {
    params: {
      active_only: activeOnly,
    },
  });

  return response.data;
}

export async function getLabTest(
  testId: number,
): Promise<LabTest> {
  const response = await api.get<LabTest>(
    `/lab/tests/${testId}`,
  );

  return response.data;
}

export async function createLabTest(
  payload: CreateLabTestPayload,
): Promise<LabTest> {
  const response = await api.post<LabTest>(
    "/lab/tests",
    payload,
  );

  return response.data;
}

export async function updateLabTest(
  testId: number,
  payload: UpdateLabTestPayload,
): Promise<LabTest> {
  const response = await api.put<LabTest>(
    `/lab/tests/${testId}`,
    payload,
  );

  return response.data;
}

// =====================================================
// LAB ORDERS
// =====================================================

export async function createLabOrder(
  payload: CreateLabOrderPayload,
): Promise<LabOrder> {
  const response = await api.post<LabOrder>(
    "/lab/orders",
    payload,
  );

  return response.data;
}

export async function getLabOrders(params?: {
  patientId?: number;
  encounterId?: number;
  doctorId?: number;
  status?: LabOrderStatus;
}): Promise<LabOrder[]> {
  const response = await api.get<LabOrder[]>(
    "/lab/orders",
    {
      params: {
        patient_id: params?.patientId,
        encounter_id: params?.encounterId,
        doctor_id: params?.doctorId,
        order_status: params?.status,
      },
    },
  );

  return response.data;
}

export async function getPatientLabOrders(
  patientId: number,
): Promise<LabOrder[]> {
  const response = await api.get<LabOrder[]>(
    `/lab/orders/patient/${patientId}`,
  );

  return response.data;
}

export async function getEncounterLabOrders(
  encounterId: number,
): Promise<LabOrder[]> {
  const response = await api.get<LabOrder[]>(
    `/lab/orders/encounter/${encounterId}`,
  );

  return response.data;
}

export async function getLabOrder(
  orderId: number,
): Promise<LabOrder> {
  const response = await api.get<LabOrder>(
    `/lab/orders/${orderId}`,
  );

  return response.data;
}

export async function updateLabOrder(
  orderId: number,
  payload: UpdateLabOrderPayload,
): Promise<LabOrder> {
  const response = await api.put<LabOrder>(
    `/lab/orders/${orderId}`,
    payload,
  );

  return response.data;
}

export async function cancelLabOrder(
  orderId: number,
): Promise<LabOrder> {
  const response = await api.post<LabOrder>(
    `/lab/orders/${orderId}/cancel`,
  );

  return response.data;
}

// =====================================================
// LAB ORDER ITEMS
// =====================================================

export async function getLabOrderItems(
  orderId: number,
): Promise<LabOrderItem[]> {
  const response = await api.get<LabOrderItem[]>(
    `/lab/orders/${orderId}/items`,
  );

  return response.data;
}

export async function getLabOrderItem(
  itemId: number,
): Promise<LabOrderItem> {
  const response = await api.get<LabOrderItem>(
    `/lab/order-items/${itemId}`,
  );

  return response.data;
}

// =====================================================
// LAB SAMPLES
// =====================================================

export async function createLabSample(
  orderId: number,
  payload: CreateLabSamplePayload,
): Promise<LabSample> {
  const response = await api.post<LabSample>(
    `/lab/orders/${orderId}/samples`,
    payload,
  );

  return response.data;
}

export async function getLabSamplesForOrder(
  orderId: number,
): Promise<LabSample[]> {
  const response = await api.get<LabSample[]>(
    `/lab/orders/${orderId}/samples`,
  );

  return response.data;
}

export async function getLabSample(
  sampleId: number,
): Promise<LabSample> {
  const response = await api.get<LabSample>(
    `/lab/samples/${sampleId}`,
  );

  return response.data;
}

export async function collectLabSample(
  sampleId: number,
  payload: CollectLabSamplePayload = {},
): Promise<LabSample> {
  const response = await api.post<LabSample>(
    `/lab/samples/${sampleId}/collect`,
    payload,
  );

  return response.data;
}

export async function receiveLabSample(
  sampleId: number,
  payload: ReceiveLabSamplePayload = {},
): Promise<LabSample> {
  const response = await api.post<LabSample>(
    `/lab/samples/${sampleId}/receive`,
    payload,
  );

  return response.data;
}

export async function processLabSample(
  sampleId: number,
): Promise<LabSample> {
  const response = await api.post<LabSample>(
    `/lab/samples/${sampleId}/process`,
  );

  return response.data;
}

export async function rejectLabSample(
  sampleId: number,
  payload: RejectLabSamplePayload,
): Promise<LabSample> {
  const response = await api.post<LabSample>(
    `/lab/samples/${sampleId}/reject`,
    payload,
  );

  return response.data;
}

// =====================================================
// LAB RESULTS
// =====================================================

export async function getPatientLabResults(
  patientId: number,
): Promise<LabResult[]> {
  const response = await api.get<LabResult[]>(
    `/lab/results/patient/${patientId}`,
  );

  return response.data;
}

export async function getLabResultForOrderItem(
  itemId: number,
): Promise<LabResult> {
  const response = await api.get<LabResult>(
    `/lab/order-items/${itemId}/result`,
  );

  return response.data;
}

export async function createLabResult(
  itemId: number,
  payload: CreateLabResultPayload,
): Promise<LabResult> {
  const response = await api.post<LabResult>(
    `/lab/order-items/${itemId}/result`,
    payload,
  );

  return response.data;
}

export async function getLabResult(
  resultId: number,
): Promise<LabResult> {
  const response = await api.get<LabResult>(
    `/lab/results/${resultId}`,
  );

  return response.data;
}

export async function updateLabResult(
  resultId: number,
  payload: UpdateLabResultPayload,
): Promise<LabResult> {
  const response = await api.put<LabResult>(
    `/lab/results/${resultId}`,
    payload,
  );

  return response.data;
}

// =====================================================
// RESULT VALIDATION
// =====================================================

export async function validateLabResult(
  resultId: number,
  payload: ValidateLabResultPayload = {},
): Promise<LabResult> {
  const response = await api.post<LabResult>(
    `/lab/results/${resultId}/validate`,
    payload,
  );

  return response.data;
}

// =====================================================
// DOCTOR REVIEW
// =====================================================

export async function reviewLabResult(
  resultId: number,
  payload: ReviewLabResultPayload = {},
): Promise<LabResult> {
  const response = await api.post<LabResult>(
    `/lab/results/${resultId}/review`,
    payload,
  );

  return response.data;
}

// =====================================================
// RESULT FINALIZATION
// =====================================================

export async function finalizeLabResult(
  resultId: number,
  payload: FinalizeLabResultPayload = {},
): Promise<LabResult> {
  const response = await api.post<LabResult>(
    `/lab/results/${resultId}/finalize`,
    payload,
  );

  return response.data;
}

// =====================================================
// PATIENT LAB HISTORY
// =====================================================

export async function getPatientLabHistory(
  patientId: number,
): Promise<PatientLabHistoryItem[]> {
  const response = await api.get<PatientLabHistoryItem[]>(
    `/lab/history/patient/${patientId}`,
  );

  return response.data;
}