import api from "./api";

// =====================================================
// AI OPERATIONS
// =====================================================

/**
 * Request sent to the HospitaX AI Operations Assistant.
 *
 * The frontend does not decide permissions or tools.
 * Those decisions remain on the backend.
 */
export type AIOperationRequest = {
  message: string;

  /**
   * Optional explicit tool name.
   * Normally the backend AI planner determines this.
   */
  tool_name?: string | null;

  /**
   * Optional arguments supplied by the UI.
   */
  arguments?: Record<string, unknown>;

  /**
   * Optional patient context.
   */
  patient_id?: number | null;

  /**
   * Required only when the backend asks for
   * explicit confirmation.
   */
  confirmed?: boolean;
};


// =====================================================
// EXECUTION STATUS
// =====================================================

export type AIExecutionStatus =
  | "success"
  | "needs_confirmation"
  | "needs_clarification"
  | "invalid"
  | "denied"
  | "error";


// =====================================================
// AI RESPONSE
// =====================================================

export type AIOperationResponse = {
  status: AIExecutionStatus;

  message: string;

  data?: unknown;

  tool_name?: string | null;

  requires_confirmation?: boolean;

  confirmation_message?: string | null;

  clarification_question?: string | null;

  /**
   * Some backend responses may expose the plan
   * directly at the top level.
   */
  plan?: unknown;

  /**
   * The current backend assistant endpoint stores
   * the generated plan inside metadata.plan.
   */
  metadata?: Record<string, unknown>;

  error?: string | null;
};


// =====================================================
// API ERROR
// =====================================================

export type AIOperationsApiError = {
  detail?: string;

  message?: string;

  status?: number;
};


// =====================================================
// SEND AI OPERATIONS REQUEST
// =====================================================

/**
 * Send a natural-language request to the HospitaX
 * AI Operations Assistant.
 *
 * Authentication is handled automatically by the
 * centralized Axios interceptor in api.ts.
 */
export async function sendAIOperation(
  payload: AIOperationRequest,
): Promise<AIOperationResponse> {
  const response = await api.post<AIOperationResponse>(
    "/ai-operations/assistant",
    {
      message: payload.message,
      tool_name: payload.tool_name ?? null,
      arguments: payload.arguments ?? {},
      patient_id: payload.patient_id ?? null,
      confirmed: payload.confirmed ?? false,
    },
  );

  return response.data;
}


// =====================================================
// CONVENIENCE — SEND MESSAGE
// =====================================================

/**
 * Simple helper for normal AI chat messages.
 */
export async function sendAIMessage(
  message: string,
  patientId?: number | null,
): Promise<AIOperationResponse> {
  return sendAIOperation({
    message,
    patient_id: patientId ?? null,
    confirmed: false,
  });
}


// =====================================================
// CONFIRM AI OPERATION
// =====================================================

/**
 * Confirm a previously proposed AI operation.
 *
 * The backend remains responsible for:
 * - authorization
 * - confirmation validation
 * - argument validation
 * - tool execution
 * - database changes
 */
export async function confirmAIOperation(
  payload: {
    message: string;
    tool_name?: string | null;
    arguments?: Record<string, unknown>;
    patient_id?: number | null;
  },
): Promise<AIOperationResponse> {
  return sendAIOperation({
    message: payload.message,
    tool_name: payload.tool_name ?? null,
    arguments: payload.arguments ?? {},
    patient_id: payload.patient_id ?? null,
    confirmed: true,
  });
}


// =====================================================
// TYPE GUARDS
// =====================================================

export function isAISuccess(
  response: AIOperationResponse,
): boolean {
  return response.status === "success";
}


export function requiresAIConfirmation(
  response: AIOperationResponse,
): boolean {
  return (
    response.status === "needs_confirmation" ||
    response.requires_confirmation === true
  );
}


export function needsAIClarification(
  response: AIOperationResponse,
): boolean {
  return response.status === "needs_clarification";
}


export function isAIDenied(
  response: AIOperationResponse,
): boolean {
  return response.status === "denied";
}


export function isAIInvalid(
  response: AIOperationResponse,
): boolean {
  return response.status === "invalid";
}


// =====================================================
// PLAN ARGUMENT HELPER
// =====================================================

/**
 * Extract arguments from the AI plan.
 *
 * The backend currently returns the generated plan
 * inside metadata.plan.
 *
 * This helper keeps the UI independent from the exact
 * response nesting and is mainly used by the
 * confirmation flow.
 */
export function getAIPlanArguments(
  response: AIOperationResponse,
): Record<string, unknown> {
  const directPlan = response.plan;

  const metadataPlan =
    response.metadata &&
    typeof response.metadata === "object"
      ? response.metadata.plan
      : undefined;

  const plan =
    directPlan ?? metadataPlan;

  if (
    !plan ||
    typeof plan !== "object"
  ) {
    return {};
  }

  const planObject = plan as {
    arguments?: unknown;
  };

  if (
    planObject.arguments &&
    typeof planObject.arguments === "object" &&
    !Array.isArray(planObject.arguments)
  ) {
    return planObject.arguments as Record<string, unknown>;
  }

  return {};
}


// =====================================================
// ERROR MESSAGE HELPER
// =====================================================

export function getAIOperationErrorMessage(
  error: unknown,
): string {
  if (
    error &&
    typeof error === "object"
  ) {
    const axiosError = error as {
      response?: {
        data?: AIOperationsApiError;
        status?: number;
      };
      message?: string;
    };

    const responseData =
      axiosError.response?.data;

    if (
      responseData &&
      typeof responseData === "object"
    ) {
      if (
        typeof responseData.detail === "string" &&
        responseData.detail.trim()
      ) {
        return responseData.detail;
      }

      if (
        typeof responseData.message === "string" &&
        responseData.message.trim()
      ) {
        return responseData.message;
      }
    }

    if (
      typeof axiosError.message === "string" &&
      axiosError.message.trim()
    ) {
      return axiosError.message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return (
    "Unable to communicate with the AI Operations Assistant."
  );
}